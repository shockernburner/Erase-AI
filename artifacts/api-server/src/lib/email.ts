import { logger } from "./logger";

// Transactional email through Resend (https://resend.com). Configure with:
//   RESEND_API_KEY  — API key from the Resend dashboard
//   EMAIL_FROM      — sender on a domain verified in Resend,
//                     default "EraseAI <no-reply@eraseai.ai>"
// Without RESEND_API_KEY nothing is sent and callers get `false`.

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ subject: msg.subject }, "Email not sent: RESEND_API_KEY is not set");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "EraseAI <no-reply@eraseai.ai>",
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: (await res.text()).slice(0, 500) }, "Resend rejected email");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Email send failed");
    return false;
  }
}
