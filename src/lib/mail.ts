/**
 * Email sender — uses RESEND_API_KEY if set, else logs (dev) and still returns ok.
 * Set in .env.local:
 *   RESEND_API_KEY=re_xxx
 *   MAIL_FROM=EarnFlow <onboarding@resend.dev>
 */

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(
  payload: MailPayload,
): Promise<{ ok: boolean; mode: "resend" | "log"; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.MAIL_FROM?.trim() || "EarnFlow <onboarding@resend.dev>";

  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [payload.to],
          subject: payload.subject,
          text: payload.text,
          html: payload.html || `<pre>${payload.text}</pre>`,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Resend error", err);
        return { ok: false, mode: "resend", error: err };
      }
      return { ok: true, mode: "resend" };
    } catch (e) {
      console.error("mail send failed", e);
      return { ok: false, mode: "resend", error: String(e) };
    }
  }

  console.info(
    `[mail:log] to=${payload.to} subject=${payload.subject}\n${payload.text}`,
  );
  return { ok: true, mode: "log" };
}
