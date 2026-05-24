import { Router } from "express";
import { User } from "../models/User.js";
import { Credential } from "../models/Credential.js";
import { Path } from "../models/Path.js";
import { Evaluation } from "../models/Evaluation.js";

const router = Router();

/**
 * Public portfolio fetch by handle. No auth required — this is the recruiter
 * surface. Shapes the response to omit sensitive fields.
 */
router.get("/:handle", async (req, res) => {
  const handle = req.params.handle.toLowerCase();
  const user = await User.findOne({ handle }).lean();
  if (!user) return res.status(404).json({ error: "Not found" });

  const [credentials, activePath, latestEvals] = await Promise.all([
    Credential.find({ userId: user._id }).sort({ issuedAt: -1 }).lean(),
    Path.findOne({ userId: user._id, status: "active" })
      .select("targetRole timelineWeeks summary phases createdAt generatedBy")
      .lean(),
    Evaluation.find({ userId: user._id, passed: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("repoUrl projectTitle finalScore strengths claimedSkills modelsUsed createdAt")
      .lean(),
  ]);

  res.json({
    profile: {
      handle: user.handle,
      name: user.name,
      avatarUrl: user.avatarUrl,
      githubUsername: user.githubUsername,
      targetRole: user.profile?.targetRole || "",
      background: user.profile?.background || "",
      streak: user.streak,
    },
    activePath: activePath
      ? {
          targetRole: activePath.targetRole,
          summary: activePath.summary,
          phaseCount: activePath.phases?.length || 0,
          completedMilestones: activePath.phases?.reduce(
            (acc, p) => acc + (p.milestones?.filter((m) => m.status === "done").length || 0),
            0,
          ),
          totalMilestones: activePath.phases?.reduce(
            (acc, p) => acc + (p.milestones?.length || 0),
            0,
          ),
          generatedBy: activePath.generatedBy,
        }
      : null,
    credentials: credentials.map((c) => ({
      id: String(c._id),
      type: c.type,
      title: c.title,
      skills: c.skills,
      issuedAt: c.issuedAt,
      signature: c.signature,
      evidence: c.evidence,
    })),
    projects: latestEvals.map((e) => ({
      id: String(e._id),
      title: e.projectTitle,
      repoUrl: e.repoUrl,
      score: e.finalScore,
      strengths: e.strengths,
      skills: e.claimedSkills,
      modelsUsed: e.modelsUsed,
      evaluatedAt: e.createdAt,
    })),
  });
});

export default router;
