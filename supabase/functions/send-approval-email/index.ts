// Supabase Edge Function — sends an "approved + scheduled" email to a
// parishioner once an admin approves their sacrament request.
//
// Uses the same MAILERSEND_API_KEY / FROM_EMAIL env vars as send-request-email.
// Without MAILERSEND_API_KEY this returns `{ skipped: true }` so the admin
// approval flow never fails just because email isn't configured yet.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.to || !body?.serviceName) {
      return json({ error: "Missing 'to' or 'serviceName'." }, 400);
    }

    const apiKey = Deno.env.get("MAILERSEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Parish Office <onboarding@mailersend.net>";

    if (!apiKey) {
      return json({ skipped: true, reason: "MAILERSEND_API_KEY not set" });
    }

    // Parse "Name <email@domain.com>" format
    const emailMatch = fromEmail.match(/<(.+?)>/);
    const email = emailMatch ? emailMatch[1] : fromEmail;
    const nameMatch = fromEmail.match(/^(.+?)\s*</);
    const name = nameMatch ? nameMatch[1].trim() : "Parish Office";

    const detailsRows = [
      body.eventDate ? rowHtml("Date", body.eventDate) : "",
      body.eventTime ? rowHtml("Time", body.eventTime) : "",
      body.location ? rowHtml("Location", body.location) : "",
      body.priestName ? rowHtml("Priest", body.priestName) : "",
    ]
      .filter(Boolean)
      .join("");

    const subject = `Your ${body.serviceName} request has been approved`;
    const html = `
      <div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #333;">
        <h1 style="color: #B59E74; letter-spacing: 0.2em; text-transform: uppercase; font-size: 18px;">
          San Pedro Bautista Parish
        </h1>
        <h2 style="color: #4a8c4a; font-weight: 500;">Your request has been approved</h2>
        <p>Your <strong>${escapeHtml(body.serviceName)}</strong> request has been approved by the parish office.</p>
        ${detailsRows
          ? `<table style="margin-top: 16px; border-collapse: collapse; width: 100%; background: #F6F5ED; border-radius: 8px; overflow: hidden;">${detailsRows}</table>`
          : ""}
        <p style="margin-top: 24px;">
          Please arrive 15 minutes before the scheduled time. If you need to reschedule, contact the parish office at your earliest convenience.
        </p>
        <p style="color:#888; font-size: 12px; margin-top: 32px;">
          God bless you. — San Pedro Bautista Parish Office
        </p>
      </div>
    `.trim();

    const r = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email, name },
        to: [{ email: body.to }],
        subject,
        html,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return json({ error: `MailerSend API error: ${errText}` }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message || "Internal server error" }, 500);
  }
});

function rowHtml(label: string, value: string) {
  return `<tr>
    <td style="padding: 8px 12px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; width: 35%;">${escapeHtml(label)}</td>
    <td style="padding: 8px 12px; color: #333; font-weight: 500;">${escapeHtml(value)}</td>
  </tr>`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
