/**
 * Prompt templates. Kept as functions (not Map values in DB) because they
 * contain structural instructions that shouldn't be edited casually. Surface
 * copy is in SiteConfig; prompts live in code.
 */

export const PARSE_GOAL_PROMPT = `You are a structured-extraction service. Given a user's free-form learning goal, extract a profile as strict JSON.

Output schema:
{
  "targetRole": "string (e.g., 'AI engineer at startup', 'Backend developer')",
  "timelineWeeks": "integer 4-52",
  "weeklyHours": "integer 5-40",
  "currentSkills": [{"skill": "string", "level": "integer 1-5"}],
  "background": "string (one sentence, third-person)",
  "feasibilityNote": "string or null — only set if the goal is unrealistic for the timeline"
}

Rules:
- If timeline is unstated, default 12 weeks.
- If weekly hours are unstated, default 10.
- Skill levels: 1=heard of it, 3=can build with help, 5=can teach it.
- Output JSON only, no preamble.`;

export const PATH_GENERATION_PROMPT = (params: {
  profile: object;
  resources: object[];
  similarLearners: object[];
}) => `You are an expert career coach generating a personalized learning path.

LEARNER PROFILE:
${JSON.stringify(params.profile, null, 2)}

AVAILABLE FREE RESOURCES (sample, ranked by quality):
${JSON.stringify(params.resources.slice(0, 25), null, 2)}

${
  params.similarLearners.length
    ? `SIMILAR PAST LEARNERS (use as evidence of what works, not as templates):
${JSON.stringify(params.similarLearners, null, 2)}`
    : ""
}

INSTRUCTIONS:
Generate a path as strict JSON. Schema:
{
  "summary": "2-sentence overview of the path",
  "stretchGoalWarning": "string or empty — only if timeline is too tight",
  "phases": [
    {
      "name": "Phase name (e.g., 'Foundations', 'Applied ML', 'Portfolio', 'Interview prep')",
      "description": "1 sentence",
      "weeks": [1, 2, 3],
      "milestones": [
        {
          "week": 1,
          "topic": "concrete topic",
          "summary": "1 sentence on what they will learn",
          "deliverable": "what they hand in (project / problem set / writeup)",
          "resources": [
            { "title": "...", "url": "...", "type": "video|article|course|book|doc", "expectedMinutes": 45 }
          ]
        }
      ],
      "projects": [
        {
          "title": "Project name",
          "description": "what to build",
          "difficulty": "easy|medium|hard",
          "expectedHours": 10,
          "skills": ["skill1", "skill2"],
          "isNorthStar": false
        }
      ]
    }
  ]
}

Rules:
1. Every milestone must have a concrete deliverable.
2. Allocate at most 60% of time to consumption; 40% must be active work.
3. Phase order: foundations -> applied -> portfolio -> interview prep.
4. Exactly one project must have "isNorthStar": true and integrate skills from >=3 phases.
5. Prefer resources from the provided list; only invent URLs if you must (and mark type accurately).
6. Be realistic about hours — if infeasible, set "stretchGoalWarning".
7. Output JSON only.`;

export const PROJECT_EVAL_TEXT_PROMPT = (params: {
  projectTitle: string;
  claimedSkills: string[];
  readme: string;
  fileTree: string;
  codeExcerpts: string;
}) => `You are evaluating whether a developer's project demonstrates real, original work.

PROJECT: ${params.projectTitle}
CLAIMED SKILLS: ${params.claimedSkills.join(", ")}

README:
${params.readme.slice(0, 4000)}

FILE TREE:
${params.fileTree.slice(0, 3000)}

CODE EXCERPTS:
${params.codeExcerpts.slice(0, 8000)}

Score the project across:
1. Functionality — does the code do what the README claims?
2. Originality — does this look like the user's own work, or a tutorial clone?
3. Quality — code structure, error handling, tests, commits.
4. Skill match — does the work actually demonstrate the claimed skills?

Output strict JSON:
{
  "scores": {
    "functionality": 0.0,
    "originality": 0.0,
    "quality": 0.0,
    "skillMatch": 0.0
  },
  "overall": 0.0,
  "passed": true,
  "strengths": ["..."],
  "improvements": ["..."],
  "feedback": "2-3 sentence summary the user will see",
  "tutorialCloneSignals": ["any specific signs this is copied, or empty array"]
}

Be honest. A pass requires overall >= 0.65 AND originality >= 0.55.
Output JSON only.`;

export const PROJECT_EVAL_VISUAL_PROMPT = (params: {
  projectTitle: string;
  textFindings: string;
}) => `You are evaluating a project's UI/visual implementation from screenshots.

PROJECT: ${params.projectTitle}

Earlier text-based code review found:
${params.textFindings.slice(0, 2000)}

Now look at the attached screenshot(s). Evaluate:
1. Does the UI match what the code suggests?
2. Is the visual design coherent (alignment, spacing, contrast)?
3. Are there visible polish issues (broken layouts, placeholder text, console errors)?
4. Does it look like a finished product or a half-built demo?

Output strict JSON:
{
  "visualScore": 0.0,
  "uiCohesion": "high|medium|low",
  "polishLevel": "shipped|demo|prototype",
  "findings": ["..."],
  "matchesCodeClaims": true,
  "summary": "1-2 sentence visual review"
}
Output JSON only.`;

export const QUIZ_GENERATION_PROMPT = (params: { topic: string; level: 1 | 2 | 3 | 4 | 5; n: number }) => `Generate ${params.n} multiple-choice questions on "${params.topic}" at level ${params.level}/5 (1=intro, 5=senior).

Output strict JSON:
{
  "topic": "${params.topic}",
  "questions": [
    {
      "q": "question text",
      "choices": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "explanation": "why this is correct, 1 sentence"
    }
  ]
}

Rules: avoid trivia, focus on understanding. Distractors must be plausible.
Output JSON only.`;
