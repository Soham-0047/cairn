import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { SiteConfig } from "../models/SiteConfig.js";
import { logger } from "../utils/logger.js";

/**
 * Refresh the SEO fields on the existing SiteConfig singleton.
 *
 * Mongoose `default:` values only apply when a document is created, so a
 * database seeded before the SEO rewrite keeps serving the old title and
 * description — and because the frontend prefers the backend's values over its
 * own constants, those stale strings are what search engines index.
 *
 * Run once after deploying the SEO changes:
 *
 *   npm run refresh-seo
 *
 * Re-runnable and safe. It overwrites the SEO title/description, so if an
 * admin has deliberately customised them in /admin/site, skip this and edit
 * there instead.
 */

// Kept in sync with frontend/src/lib/site.ts.
const SEO_TITLE = "Cairn — AI Learning Path Generator with Verified Project Credentials";
const SEO_DESCRIPTION =
  "Cairn builds you a free, personalized 12-week learning path from the best free tutorials on the internet, " +
  "reviews the projects you ship with AI (code + screenshots), and issues signed credentials that build a " +
  "recruiter-ready portfolio. Free to start, no course to buy.";
const HERO_SUBTITLE =
  "Cairn turns the internet's chaos of free tutorials into a 12-week path that adapts to your starting point, " +
  "verifies your projects, and builds a recruiter-ready portfolio.";

async function main() {
  await connectDB();

  const res = await SiteConfig.updateOne(
    { key: "default" },
    {
      $set: {
        "seo.title": SEO_TITLE,
        "seo.description": SEO_DESCRIPTION,
        // "/favicon.ico" was never a real file. Clearing it lets the frontend
        // fall back to Next's `app/icon.svg` convention.
        "brand.faviconUrl": "",
        "copy.heroSubtitle": HERO_SUBTITLE,
      },
    },
    { upsert: true },
  );

  logger.info({ matched: res.matchedCount, modified: res.modifiedCount }, "Refreshed SiteConfig SEO fields");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.fatal({ err }, "refresh-seo failed");
  process.exit(1);
});
