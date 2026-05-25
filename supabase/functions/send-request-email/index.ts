// Supabase Edge Function — sends an "request received" email to a parishioner
// after they submit a sacrament request.
//
// SETUP REQUIRED before this function will actually deliver mail:
//   1. Sign up for MailerSend (https://app.mailersend.com/) — free tier is fine.
//   2. Generate an API token in Settings → API.
//   3. Verify the sender domain under Sending Domains (or use trial domain temporarily).
//   4. In the Supabase Dashboard → Edge Functions → Settings, set:
//        MAILERSEND_API_KEY = "ms_xxxxxxxxxxxxxxxxxxxxxx"
//        FROM_EMAIL         = "Parish Office <noreply@yourdomain.com>"
//   5. Deploy:  npx supabase functions deploy send-request-email
//
// Without MAILERSEND_API_KEY this function returns 200 with `{ skipped: true }` —
// it is safe to call from the client without breaking the request flow.

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

    const subject = `We received your ${body.serviceName} request`;
    const html = `
      <div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #333;">
        <h1 style="color: #B59E74; letter-spacing: 0.2em; text-transform: uppercase; font-size: 18px;">
          San Pedro Bautista Parish
        </h1>
        <h2 style="color: #333; font-weight: 500;">Thank you for your request</h2>
        <p>We have received your <strong>${escapeHtml(body.serviceName)}</strong> request.</p>
        <p>Our parish office will review the details and you will receive another email once it has been approved or if more information is needed.</p>
        ${body.summary
          ? `<p style="background:#F6F5ED; padding:16px; border-left:3px solid #B59E74; font-style:italic;">${escapeHtml(body.summary)}</p>`
          : ""}
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
