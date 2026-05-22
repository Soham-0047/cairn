import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { User } from "../models/User.js";
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
    isGuest: user.isGuest,
    guestExpiresAt: user.guestExpiresAt,
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
