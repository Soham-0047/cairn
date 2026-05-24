import { createHash } from "crypto";
import { Resend } from "resend";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

function hashRecipient(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12);
}

async function send(
  type: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const client = getResend();
  if (!client) {
    logger.warn({ type, recipient: hashRecipient(to) }, "RESEND_API_KEY not set — skipping email");
    return;
  }
  try {
    const res = await client.emails.send({
      from: env.FROM_EMAIL,
      to,
      subject,
      html,
    });
    logger.info(
      {
        type,
        recipient: hashRecipient(to),
        messageId: res.data?.id,
        error: res.error?.message,
      },
      "Email sent",
    );
  } catch (err) {
    logger.warn(
      { type, recipient: hashRecipient(to), err: err instanceof Error ? err.message : String(err) },
      "Resend send failed",
    );
  }
}

const wrap = (inner: string) => `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; color: #1a1a2e; background: #fafaf7;">
  <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 24px;">Cairn</div>
  ${inner}
  <p style="margin-top: 32px; font-size: 12px; color: #888;">— The Cairn team</p>
</body></html>`;

export async function sendEvalComplete(
  to: string,
  result: { passed: boolean; score: number; portfolioUrl: string; projectTitle: string },
): Promise<void> {
  const pct = Math.round(result.score * 100);
  const subject = result.passed
    ? `Your project "${result.projectTitle}" passed — ${pct}/100`
    : `Evaluation complete for "${result.projectTitle}"`;
  const html = wrap(`
    <h1 style="font-size: 24px; margin: 0 0 12px;">${result.passed ? "You passed." : "Evaluation complete."}</h1>
    <p style="font-size: 15px; line-height: 1.6;">Your submission <strong>${escapeHtml(result.projectTitle)}</strong> scored <strong>${pct}/100</strong>.</p>
    ${
      result.passed
        ? `<p style="font-size: 15px; line-height: 1.6;">A verified credential has been added to your portfolio.</p>`
        : `<p style="font-size: 15px; line-height: 1.6;">It didn't clear the threshold this time — open the eval to see specific improvements.</p>`
    }
    <p style="margin-top: 24px;"><a href="${result.portfolioUrl}" style="display: inline-block; padding: 10px 18px; background: #1a1a2e; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px;">View portfolio</a></p>
  `);
  await send("eval_complete", to, subject, html);
}

export async function sendWeeklyNudge(
  to: string,
  handle: string,
  currentWeek: number,
  nextMilestone: string,
): Promise<void> {
  const subject = `Week ${currentWeek} — ${nextMilestone}`;
  const html = wrap(`
    <h1 style="font-size: 22px; margin: 0 0 12px;">Hey ${escapeHtml(handle)} — week ${currentWeek} is waiting.</h1>
    <p style="font-size: 15px; line-height: 1.6;">Your next milestone is <strong>${escapeHtml(nextMilestone)}</strong>. It's been a few days — log even one resource or a short note to keep the streak alive.</p>
    <p style="margin-top: 24px;"><a href="${process.env.FRONTEND_URL || "https://cairn.dev"}/dashboard" style="display: inline-block; padding: 10px 18px; background: #1a1a2e; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px;">Open dashboard</a></p>
  `);
  await send("weekly_nudge", to, subject, html);
}

export async function sendCredentialIssued(
  to: string,
  credentialUrl: string,
  projectTitle: string,
): Promise<void> {
  const subject = `Credential issued — ${projectTitle}`;
  const html = wrap(`
    <h1 style="font-size: 22px; margin: 0 0 12px;">Credential minted.</h1>
    <p style="font-size: 15px; line-height: 1.6;">Your work on <strong>${escapeHtml(projectTitle)}</strong> has been verified and a signed credential is now public on your portfolio.</p>
    <p style="margin-top: 24px;"><a href="${credentialUrl}" style="display: inline-block; padding: 10px 18px; background: #1a1a2e; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px;">View credential</a></p>
  `);
  await send("credential_issued", to, subject, html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
