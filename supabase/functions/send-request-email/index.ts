// Supabase Edge Function — sends an "request received" email to a parishioner
// after they submit a sacrament request.
//
// SETUP REQUIRED before this function will actually deliver mail:
//   1. Sign up for Resend (https://resend.com) — free tier is fine.
//   2. Verify the sender domain or use the resend.dev test sender for now.
//   3. In the Supabase Dashboard → Edge Functions → Settings, set:
//        RESEND_API_KEY     = "re_xxxxxxxxxxxxxx"
//        FROM_EMAIL         = "Parish Office <noreply@yourdomain.com>"
//   4. Deploy:  npx supabase functions deploy send-request-email
//
// Without RESEND_API_KEY this function returns 200 with `{ skipped: true }` —
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

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("FROM_EMAIL") || "Parish Office <onboarding@resend.dev>";

    if (!apiKey) {
      return json({ skipped: true, reason: "RESEND_API_KEY not set" });
    }

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

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: body.to, subject, html }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return json({ error: `Resend API error: ${errText}` }, 500);
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
