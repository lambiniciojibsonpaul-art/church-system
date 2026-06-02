import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_TABLES = new Set([
  "baptisms",
  "confirmations",
  "holy_communions",
  "weddings",
  "mass_intentions",
  "facilities_bookings",
  "certification_requests",
  "sacraments_liturgical",
  "attendance",
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ' .-]+$/;
const CONTACT_RE = /^\d{11}$/;
const NAME_PART_MAX = 60;
const NAME_FULL_MAX = 120;

function validatePayload(payload: Record<string, unknown>): string | null {
  for (const [key, rawValue] of Object.entries(payload)) {
    if (rawValue === null || rawValue === undefined) continue;
    if (typeof rawValue !== 'string') continue;

    const value = rawValue.trim();
    if (!value) continue;
    const k = key.toLowerCase();

    if (k.includes('email') && !EMAIL_RE.test(value)) {
      return `Invalid email in field "${key}"`;
    }

    if ((k.includes('contact') || k.includes('phone')) && !CONTACT_RE.test(value.replace(/\s+/g, ''))) {
      return `Contact number in field "${key}" must be exactly 11 digits`;
    }

    const isNameField =
      k.includes('name') ||
      k.includes('requested_by') ||
      k.includes('submitter_signature') ||
      k.includes('celebrant');

    if (isNameField && !NAME_RE.test(value)) {
      return `Invalid name text in field "${key}"`;
    }
    if (isNameField) {
      const maxLen = k.includes('full_name') || k.includes('signature') ? NAME_FULL_MAX : NAME_PART_MAX;
      if (value.length > maxLen) {
        return `Field "${key}" exceeds max length (${maxLen})`;
      }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.table || !body.payload) {
      return new Response(JSON.stringify({ error: 'table and payload are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { table, payload } = body

    // Strict whitelist — only sacrament request tables are allowed
    if (!ALLOWED_TABLES.has(table)) {
      return new Response(JSON.stringify({ error: `Table "${table}" is not allowed` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const sUrl = Deno.env.get('SUPABASE_URL')
    const sKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!sUrl || !sKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Service role key bypasses RLS — safe because table is whitelisted above
    const supabase = createClient(sUrl, sKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const validationError = validatePayload(payload)
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Duplicate guest check-in guard
    if (table === "attendance" && payload.is_guest && payload.guest_name && payload.event_id) {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("event_id", payload.event_id)
        .eq("guest_name", payload.guest_name)
        .eq("is_guest", true)
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: "already_checked_in" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }
    }

    const { error } = await supabase.from(table).insert([payload])

    if (error) {
      console.error(`[submit-guest-form] insert error on ${table}:`, error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('[submit-guest-form] unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Unexpected error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
