import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Path } from "../models/Path.js";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import { checkGuestLimit } from "../middleware/guestLimits.js";
import { generatePath, parseGoal } from "../services/path.service.js";
import { LLMChainError } from "../llm/router.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.post("/parse", requireUser, async (req: AuthedRequest, res) => {
  const schema = z.object({ goal: z.string().min(10).max(2000) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const parsed = await parseGoal(parse.data.goal);
    res.json(parsed);
  } catch (err) {
    logger.error({ err }, "parse failed");
    res.status(502).json({ error: "Could not parse goal — try again." });
  }
});

router.post("/", requireUser, checkGuestLimit("path"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    goal: z.string().min(10).max(2000),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  // Stream as SSE so the response starts flowing immediately. This is what
  // keeps Netlify Functions from timing out the proxy after ~26s while the
  // LLM chain churns through its options — every heartbeat is a write,
  // which resets the upstream idle timer and prevents a 502.
  const wantsSSE = (req.headers.accept || "").includes("text/event-stream");
  if (!wantsSSE) {
    // Legacy JSON path kept for non-browser callers (curl, server-side tests).
    try {
      await Path.updateMany(
        { userId: req.userId, status: "active" },
        { $set: { status: "abandoned" } },
      );
      const path = await generatePath({ userId: req.userId!, goal: parse.data.goal });
      return res.json(path);
    } catch (err) {
      logger.error({ err }, "path generation failed");
      if (err instanceof LLMChainError) {
        return res.status(502).json({
          error: "Path generation failed",
          message: err.message,
          trace: err.trace,
          hint: "Open /admin/credentials to verify keys, or /admin/providers to edit the routing chain.",
        });
      }
      return res.status(502).json({
        error: "Path generation failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  // SSE comment heartbeats every 5s — bytes on the wire keep intermediaries
  // (Netlify, Render, browser) from declaring the connection idle.
  const heartbeat = setInterval(() => {
    res.write(`: keep-alive ${Date.now()}\n\n`);
  }, 5000);

  try {
    send("stage", { stage: "starting" });
    await Path.updateMany(
      { userId: req.userId, status: "active" },
      { $set: { status: "abandoned" } },
    );
    send("stage", { stage: "generating" });
    const path = await generatePath({ userId: req.userId!, goal: parse.data.goal });
    send("done", path);
  } catch (err) {
    logger.error({ err }, "path generation failed");
    if (err instanceof LLMChainError) {
      send("error", {
        error: "Path generation failed",
        message: err.message,
        trace: err.trace,
        hint: "Open /admin/credentials to verify keys, or /admin/providers to edit the routing chain.",
      });
    } else {
      send("error", {
        error: "Path generation failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

router.get("/active", requireUser, async (req: AuthedRequest, res) => {
  const path = await Path.findOne({ userId: req.userId, status: "active" })
    .sort({ createdAt: -1 })
    .lean();
  res.json(path || null);
});

router.get("/:id", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const path = await Path.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!path) return res.status(404).json({ error: "Not found" });
  res.json(path);
});

router.post("/:id/milestone/done", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const milestoneBody = z
    .object({
      phaseIndex: z.number().int().min(0).max(50),
      milestoneIndex: z.number().int().min(0).max(50),
    })
    .safeParse(req.body);
  if (!milestoneBody.success) {
    return res.status(400).json({ error: milestoneBody.error.flatten() });
  }
  const { phaseIndex, milestoneIndex } = milestoneBody.data;
  const update = await Path.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    {
      $set: { [`phases.${phaseIndex}.milestones.${milestoneIndex}.status`]: "done" },
    },
    { new: true },
  ).lean();
  if (!update) return res.status(404).json({ error: "Not found" });
  res.json(update);
});

export default router;
