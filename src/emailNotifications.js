// Client-side wrapper for the parish notification edge functions.
// Both calls are fire-and-forget: errors are logged but never thrown.
// Until the RESEND_API_KEY env var is set on the Supabase project, the
// functions return `{ skipped: true }` and these helpers silently no-op.

import { supabase } from "./supabaseClient";

export async function sendRequestEmail({ to, serviceName, summary }) {
  if (!to) return;
  try {
    const { error } = await supabase.functions.invoke("send-request-email", {
      body: { to, serviceName, summary },
    });
    if (error) console.warn("[email] request notification failed:", error.message);
  } catch (err) {
    console.warn("[email] request notification threw:", err.message);
  }
}

export async function sendApprovalEmail({
  to,
  serviceName,
  eventDate,
  eventTime,
  location,
  priestName,
}) {
  if (!to) return;
  try {
    const { error } = await supabase.functions.invoke("send-approval-email", {
      body: { to, serviceName, eventDate, eventTime, location, priestName },
    });
    if (error) console.warn("[email] approval notification failed:", error.message);
  } catch (err) {
    console.warn("[email] approval notification threw:", err.message);
  }
}
