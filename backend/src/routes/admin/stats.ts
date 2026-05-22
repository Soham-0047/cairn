import { Router } from "express";
import { User } from "../../models/User.js";
import { Path } from "../../models/Path.js";
import { Evaluation } from "../../models/Evaluation.js";
import { Credential } from "../../models/Credential.js";

const router = Router();

router.get("/", async (_req, res) => {
  const [users, paths, activePaths, evals, passedEvals, credentials] = await Promise.all([
    User.countDocuments(),
    Path.countDocuments(),
    Path.countDocuments({ status: "active" }),
    Evaluation.countDocuments(),
    Evaluation.countDocuments({ passed: true }),
    Credential.countDocuments(),
  ]);

  const recentEvals = await Evaluation.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select("projectTitle finalScore passed modelsUsed createdAt")
    .lean();

  res.json({
    counts: { users, paths, activePaths, evals, passedEvals, credentials },
    recentEvals,
  });
});

export default router;
