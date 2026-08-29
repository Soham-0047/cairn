import { getRouter, type TaskType } from "../llm/router.js";
import { logger } from "../utils/logger.js";
import type {
  AgentAction,
  AgentProgress,
  AgentRun,
  AgentStep,
  Tool,
  ToolResult,
} from "./types.js";

/**
 * A bounded ReAct-style loop: think → act → observe, until the agent emits a
 * final answer or exhausts its budget.
 *
 * Three properties matter here:
 *
 *  1. **Budget, not just step count.** Step count alone lets an agent burn the
 *     whole free-tier quota on cheap-looking calls. Each tool declares a cost;
 *     the run stops when the budget is spent. Latency and quota are bounded by
 *     construction rather than by hoping the model stops.
 *
 *  2. **Repeat-call suppression.** Small models loop — they re-read the same
 *     file when unsure what to do next. A repeated (tool, args) pair returns a
 *     cached observation plus an explicit nudge, which costs no budget and
 *     breaks the loop without failing the run.
 *
 *  3. **One repair attempt per malformed reply.** When the model returns prose
 *     instead of the action JSON, it gets the parse error back and one retry
 *     before the step is abandoned. Without this, a single stray markdown
 *     fence kills an otherwise healthy run.
 */

export type RunAgentOptions<Ctx> = {
  /** Label used in traces and progress events. */
  name: string;
  /** Router task — decides which model chain answers this agent's turns. */
  task: TaskType;
  systemPrompt: string;
  /** The opening user message: the goal, plus any pre-loaded context. */
  goal: string;
  tools: Tool<Ctx>[];
  ctx: Ctx;
  budget?: number;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
  onStep?: AgentProgress;
  /**
   * Validates the agent's final payload. Returning a string rejects it and the
   * agent is told why, so it can correct itself instead of the caller having to
   * discard the whole run.
   */
  validateFinal?: (result: unknown) => string | null;
};

const DEFAULT_BUDGET = 12;
const DEFAULT_MAX_STEPS = 10;
/** Observations longer than this are truncated in the transcript. */
const OBS_CHAR_LIMIT = 6_000;

export async function runAgent<Ctx, T = unknown>(
  opts: RunAgentOptions<Ctx>,
): Promise<AgentRun<T>> {
  const budgetLimit = opts.budget ?? DEFAULT_BUDGET;
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const toolsByName = new Map(opts.tools.map((t) => [t.name, t]));
  const router = getRouter();
  const startedAt = Date.now();

  const run: AgentRun<T> = {
    agent: opts.name,
    steps: [],
    result: null,
    observations: {},
    budgetUsed: 0,
    budgetLimit,
    stoppedBecause: "max_steps",
    totalLatencyMs: 0,
  };

  const transcript: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: opts.goal },
  ];
  const seen = new Map<string, ToolResult>();
  const system = `${opts.systemPrompt}\n\n${protocolBlock(opts.tools, budgetLimit)}`;

  for (let i = 0; i < maxSteps; i++) {
    if (run.budgetUsed >= budgetLimit) {
      run.stoppedBecause = "budget";
      break;
    }

    const stepStart = Date.now();
    let action: AgentAction | null = null;
    let provider: string | undefined;
    let model: string | undefined;
    let parseError = "";

    // Up to two tries: the second one carries the parse error as feedback.
    for (let attempt = 0; attempt < 2 && !action; attempt++) {
      const messages = [
        { role: "system" as const, content: system },
        ...transcript.map((m) => ({ role: m.role, content: m.content })),
        ...(parseError
          ? [
              {
                role: "user" as const,
                content: `Your last reply could not be parsed: ${parseError}\nReply with ONE JSON object matching the protocol. No markdown fences, no commentary.`,
              },
            ]
          : []),
      ];

      try {
        const { response, trace } = await router.call(opts.task, {
          messages,
          jsonSchema: { type: "object" },
          temperature: opts.temperature ?? 0.1,
          maxTokens: opts.maxTokens ?? 2048,
        });
        provider = trace.finalProvider;
        model = trace.finalModel;
        const parsed = parseAction(response.content, response.raw, toolsByName);
        if (typeof parsed === "string") {
          parseError = parsed;
          continue;
        }
        action = parsed;
      } catch (err) {
        run.stoppedBecause = "error";
        run.error = err instanceof Error ? err.message : String(err);
        run.totalLatencyMs = Date.now() - startedAt;
        logger.error({ agent: opts.name, err: run.error }, "agent step failed");
        return run;
      }
    }

    if (!action) {
      // Both attempts produced unusable output. Record it and stop — pressing
      // on would just burn quota on a model that isn't following the protocol.
      run.steps.push({
        index: i,
        thought: "",
        observation: `unparseable action: ${parseError}`,
        isError: true,
        latencyMs: Date.now() - stepStart,
        provider,
        model,
        budgetSpent: run.budgetUsed,
      });
      run.stoppedBecause = "error";
      run.error = `agent did not follow the action protocol: ${parseError}`;
      break;
    }

    if (action.kind === "final") {
      const rejection = opts.validateFinal?.(action.result);
      if (rejection) {
        transcript.push({ role: "assistant", content: JSON.stringify(action) });
        transcript.push({
          role: "user",
          content: `That final answer was rejected: ${rejection}\nFix it and reply again using the protocol.`,
        });
        run.steps.push({
          index: i,
          thought: action.thought,
          observation: `final rejected: ${rejection}`,
          isError: true,
          latencyMs: Date.now() - stepStart,
          provider,
          model,
          budgetSpent: run.budgetUsed,
        });
        opts.onStep?.(run.steps[run.steps.length - 1]!);
        continue;
      }
      run.result = action.result as T;
      run.stoppedBecause = "final";
      const step: AgentStep = {
        index: i,
        thought: action.thought,
        latencyMs: Date.now() - stepStart,
        provider,
        model,
        budgetSpent: run.budgetUsed,
      };
      run.steps.push(step);
      opts.onStep?.(step);
      break;
    }

    // ---- tool call ----
    const tool = toolsByName.get(action.tool)!; // parseAction validated this
    const key = `${action.tool}:${stableArgs(action.args)}`;
    const cached = seen.get(key);
    let result: ToolResult;
    let spent = 0;

    if (cached) {
      result = {
        ...cached,
        content: `${cached.content}\n\n[This is a repeat of an earlier call. You already have this. Use a different tool or different arguments, or give your final answer.]`,
      };
    } else {
      try {
        result = await tool.run(action.args, opts.ctx);
      } catch (err) {
        result = {
          content: `Tool error: ${err instanceof Error ? err.message : String(err)}`,
          isError: true,
        };
      }
      seen.set(key, result);
      spent = tool.cost ?? 1;
      run.budgetUsed += spent;
    }

    const observation = truncate(result.content, OBS_CHAR_LIMIT);
    run.observations[`${i}:${action.tool}`] = result.data ?? result.content;

    transcript.push({ role: "assistant", content: JSON.stringify(action) });
    transcript.push({
      role: "user",
      content: `OBSERVATION (${action.tool}):\n${observation}\n\nBudget: ${run.budgetUsed}/${budgetLimit} spent.`,
    });

    const step: AgentStep = {
      index: i,
      thought: action.thought,
      tool: action.tool,
      args: action.args,
      observation,
      isError: result.isError,
      latencyMs: Date.now() - stepStart,
      provider,
      model,
      budgetSpent: run.budgetUsed,
    };
    run.steps.push(step);
    opts.onStep?.(step);
  }

  run.totalLatencyMs = Date.now() - startedAt;
  logger.info(
    {
      agent: opts.name,
      steps: run.steps.length,
      budget: `${run.budgetUsed}/${budgetLimit}`,
      stopped: run.stoppedBecause,
      latencyMs: run.totalLatencyMs,
    },
    "agent run complete",
  );
  return run;
}

/* ------------------------------- protocol ------------------------------- */

function protocolBlock(tools: Tool<never>[] | Tool<any>[], budget: number): string {
  const specs = (tools as Tool<any>[])
    .map((t) => {
      const args = t.params
        .map(
          (p) =>
            `      "${p.name}": ${p.type}${p.required ? "" : " (optional)"} — ${p.description}`,
        )
        .join("\n");
      return `- ${t.name} (cost ${t.cost ?? 1}) — ${t.description}\n    args:\n${args || "      (none)"}`;
    })
    .join("\n");

  return `TOOLS
${specs}

PROTOCOL
Reply with exactly ONE JSON object per turn. No markdown fences. No text outside the JSON.

To use a tool:
{"thought": "why this call, in one sentence", "tool": "<tool name>", "args": {...}}

To finish:
{"thought": "why you are done", "final": { ... }}

RULES
- You have a budget of ${budget} units. Each tool call spends its cost. Spend it on evidence that changes your answer, not on confirming what you already know.
- Never call the same tool with the same arguments twice.
- If a tool errors, adapt — do not retry it unchanged.
- Give your final answer as soon as the evidence is sufficient. An early, well-supported answer beats a late, padded one.`;
}

/**
 * Accepts the parsed object when the provider honoured JSON mode, and falls
 * back to extracting the first balanced JSON object from raw text when it
 * didn't. Returns an error string instead of throwing so the caller can feed
 * the reason back to the model.
 */
export function parseAction(
  content: unknown,
  raw: string,
  tools: Map<string, Tool<any>>,
): AgentAction | string {
  let obj: Record<string, unknown> | null = null;

  if (content && typeof content === "object" && !Array.isArray(content)) {
    obj = content as Record<string, unknown>;
  } else {
    const text = typeof content === "string" ? content : raw;
    obj = extractJsonObject(text);
  }
  if (!obj) return "no JSON object found in the reply";

  const thought = typeof obj.thought === "string" ? obj.thought : "";

  if ("final" in obj && obj.final !== undefined && obj.final !== null) {
    return { kind: "final", result: obj.final, thought };
  }

  const toolName = typeof obj.tool === "string" ? obj.tool : "";
  if (!toolName) {
    return 'object had neither a "tool" nor a "final" key';
  }
  if (!tools.has(toolName)) {
    return `unknown tool "${toolName}". Available: ${[...tools.keys()].join(", ")}`;
  }
  const args =
    obj.args && typeof obj.args === "object" && !Array.isArray(obj.args)
      ? (obj.args as Record<string, unknown>)
      : {};

  const spec = tools.get(toolName)!;
  const missing = spec.params
    .filter((p) => p.required && (args[p.name] === undefined || args[p.name] === ""))
    .map((p) => p.name);
  if (missing.length) {
    return `tool "${toolName}" is missing required args: ${missing.join(", ")}`;
  }

  return { kind: "tool", tool: toolName, args, thought };
}

/** Scans for the first `{` and returns the balanced object that follows. */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Order-insensitive key for repeat detection. */
function stableArgs(args: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(args)
      .sort()
      .map((k) => [k, args[k]]),
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}\n… [truncated ${s.length - n} chars]`;
}
