import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { User } from "../models/User.js";
import { Path } from "../models/Path.js";
import { Evaluation } from "../models/Evaluation.js";
import { env } from "../config/env.js";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import { getOrCreateSiteConfig } from "../models/SiteConfig.js";

const router = Router();

const slug = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

const exchangeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().default(""),
  avatarUrl: z.string().optional().default(""),
  githubUsername: z.string().optional().default(""),
  githubAccessToken: z.string().optional().default(""),
});

/**
 * Called by Next.js after a successful NextAuth flow with the provider data.
 * We upsert the user and mint our own JWT — keeps backend stateless about NextAuth.
 */
router.post("/exchange", async (req, res) => {
  const parse = exchangeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten().fieldErrors });
  }
  const { email, name, avatarUrl, githubUsername, githubAccessToken } = parse.data;

  let user = await User.findOne({ email });
  if (!user) {
    const handle = githubUsername || `learner-${slug()}`;
    // Ensure unique handle
    let finalHandle = handle.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    while (await User.findOne({ handle: finalHandle })) {
      finalHandle = `${handle}-${slug().slice(0, 4)}`;
    }
    user = await User.create({
      email,
      name,
      avatarUrl,
      githubUsername,
      githubAccessToken,
      handle: finalHandle,
    });
  } else if (githubAccessToken && githubAccessToken !== user.githubAccessToken) {
    user.githubAccessToken = githubAccessToken;
    user.githubUsername = githubUsername || user.githubUsername;
    user.name = name || user.name;
    user.avatarUrl = avatarUrl || user.avatarUrl;
    await user.save();
  }

  const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, {
    issuer: env.JWT_ISSUER,
    expiresIn: "30d",
  });

  res.json({
    token,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      handle: user.handle,
      avatarUrl: user.avatarUrl,
      onboarded: user.onboarded,
      githubUsername: user.githubUsername,
    },
  });
});

router.get("/me", requireUser, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: String(user._id),
    email: user.email,
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    onboarded: user.onboarded,
    githubUsername: user.githubUsername,
    profile: user.profile,
    streak: user.streak,
    timezone: user.timezone,
    isGuest: user.isGuest,
    guestExpiresAt: user.guestExpiresAt,
  });
});

/**
 * Aggregated stats for the dashboard header: XP, streak, and counts.
 * XP = 100 per completed milestone + 200 per passed evaluation
 *    + bonus = round(finalScore * 100) per complete evaluation.
 */
router.get("/me/stats", requireUser, async (req: AuthedRequest, res) => {
  const userId = req.userId;
  const [user, activePath, evals] = await Promise.all([
    User.findById(userId).lean(),
    Path.findOne({ userId, status: "active" }).sort({ createdAt: -1 }).lean(),
    Evaluation.find({ userId }).sort({ createdAt: -1 }).lean(),
  ]);
  if (!user) return res.status(404).json({ error: "User not found" });

  const completedMilestones = (activePath?.phases || []).reduce(
    (acc, p) => acc + p.milestones.filter((m) => m.status === "done").length,
    0,
  );
  const totalMilestones = (activePath?.phases || []).reduce(
    (acc, p) => acc + p.milestones.length,
    0,
  );
  const passedEvals = evals.filter((e) => e.passed && e.status === "complete").length;
  const completeEvals = evals.filter((e) => e.status === "complete");
  const evalBonus = completeEvals.reduce(
    (acc, e) => acc + Math.round((e.finalScore || 0) * 100),
    0,
  );
  const xp = completedMilestones * 100 + passedEvals * 200 + evalBonus;

  res.json({
    xp,
    streak: user.streak || 0,
    completedMilestones,
    totalMilestones,
    passedEvals,
    totalEvals: evals.length,
  });
});

/**
 * Notification feed — recent evaluations + milestone events.
 * Returns most recent 20 items sorted by createdAt desc.
 */
router.get("/me/notifications", requireUser, async (req: AuthedRequest, res) => {
  const userId = req.userId;
  const evals = await Evaluation.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const items = evals.map((e) => {
    let kind: "success" | "warning" | "info" | "error" = "info";
    let title = "";
    let body = "";
    if (e.status === "complete" && e.passed) {
      kind = "success";
      title = `Verified: ${e.projectTitle || "project"}`;
      body = `Scored ${Math.round((e.finalScore || 0) * 100)}/100. Credential minted.`;
    } else if (e.status === "complete" && !e.passed) {
      kind = "warning";
      title = `Needs work: ${e.projectTitle || "project"}`;
      body = `Scored ${Math.round((e.finalScore || 0) * 100)}/100 — below threshold.`;
    } else if (e.status === "failed") {
      kind = "error";
      title = `Evaluation failed: ${e.projectTitle || "project"}`;
      body = e.error || "Something went wrong during evaluation.";
    } else {
      kind = "info";
      title = `Evaluating: ${e.projectTitle || "project"}`;
      body = `Status: ${e.status}`;
    }
    return {
      id: String(e._id),
      kind,
      title,
      body,
      href: `/projects/${String(e._id)}`,
      createdAt: e.createdAt,
    };
  });

  res.json({ items, unread: items.length });
});

const updateMeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  handle: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and dashes only")
    .optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  timezone: z.string().max(60).optional(),
  profile: z
    .object({
      targetRole: z.string().max(140).optional(),
      background: z.string().max(2000).optional(),
      weeklyHours: z.number().int().min(1).max(80).optional(),
      timelineWeeks: z.number().int().min(2).max(52).optional(),
    })
    .partial()
    .optional(),
});

router.patch("/me", requireUser, async (req: AuthedRequest, res) => {
  const parse = updateMeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten().fieldErrors });
  }
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.isGuest) {
    return res.status(403).json({ error: "Guests cannot update profile. Sign in to save changes." });
  }

  const { handle, name, avatarUrl, timezone, profile } = parse.data;

  if (handle && handle !== user.handle) {
    const exists = await User.findOne({ handle, _id: { $ne: user._id } }).lean();
    if (exists) return res.status(409).json({ error: "That handle is taken." });
    user.handle = handle;
  }
  if (typeof name === "string") user.name = name;
  if (typeof avatarUrl === "string") user.avatarUrl = avatarUrl;
  if (typeof timezone === "string") user.timezone = timezone;
  if (profile) {
    user.profile = {
      ...user.profile,
      ...profile,
    } as typeof user.profile;
  }
  await user.save();

  res.json({
    id: String(user._id),
    email: user.email,
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    githubUsername: user.githubUsername,
    profile: user.profile,
    timezone: user.timezone,
    onboarded: user.onboarded,
  });
});

/**
 * Create a guest user. Returns a JWT just like /exchange — the rest of the
 * app doesn't need to know whether the holder is a guest, only the limits
 * middleware does.
 *
 * Global rate limit: max guests per day (admin-configurable).
 */
router.post("/guest", async (_req, res) => {
  const cfg = await getOrCreateSiteConfig();
  const guest = cfg.guestMode;
  if (!guest.enabled) {
    return res.status(403).json({
      error: "Guest mode is currently disabled.",
      code: "guest_disabled",
    });
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const guestsToday = await User.countDocuments({ isGuest: true, createdAt: { $gte: since } });
  if (guestsToday >= guest.maxGuestsPerDayGlobal) {
    return res.status(429).json({
      error: "We've reached our daily guest cap. Try again in a few hours, or sign in with GitHub.",
      code: "global_guest_limit",
    });
  }

  const id = slug();
  const handle = `guest-${id}`;
  const email = `${handle}@guest.cairn.local`;
  const expiresAt = new Date(Date.now() + guest.sessionHours * 3600 * 1000);

  const user = await User.create({
    email,
    handle,
    name: `Guest ${id.slice(0, 4)}`,
    isGuest: true,
    guestExpiresAt: expiresAt,
  });

  // Short-lived JWT — matches the guest session length.
  const expSec = Math.floor(guest.sessionHours * 3600);
  const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, {
    issuer: env.JWT_ISSUER,
    expiresIn: expSec,
  });

  res.json({
    token,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      handle: user.handle,
      isGuest: true,
      guestExpiresAt: expiresAt,
    },
    limits: {
      maxPathsPerGuest: guest.maxPathsPerGuest,
      maxEvalsPerGuest: guest.maxEvalsPerGuest,
      allowScreenshots: guest.allowScreenshots,
      sessionHours: guest.sessionHours,
    },
  });
});

export default router;
