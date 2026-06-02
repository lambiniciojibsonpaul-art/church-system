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

function friendlyDatabaseError(message: string, payload: Record<string, unknown>): string {
  const text = String(message || '');
  const entries = Object.entries(payload || {});

  if (/violates check constraint|new row for relation/i.test(text)) {
    const invalidContact = entries.some(([key, value]) =>
      /contact|phone/i.test(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '' &&
      !/^\d{11}$/.test(String(value).replace(/\s+/g, ''))
    );
    if (invalidContact) return 'Contact number must be exactly 11 digits.';

    const invalidEmail = entries.some(([key, value]) =>
      /email/i.test(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '' &&
      !EMAIL_RE.test(String(value).trim())
    );
    if (invalidEmail) return 'Please enter a valid email address.';

    const invalidMoney = entries.some(([key, value]) =>
      /reservation_fee|offering_amount/i.test(key) &&
      (value === null || value === undefined || String(value).trim() === '' || !/^\d+(\.\d{1,2})?$/.test(String(value).trim()))
    );
    if (invalidMoney) return 'Amount is required and cannot be negative. Please enter 0 or a valid amount.';

    const invalidName = entries.some(([key, value]) =>
      /name|surname|requested_by|submitter_signature|celebrant/i.test(key) &&
      typeof value === 'string' &&
      value.trim() !== '' &&
      (!NAME_RE.test(value.trim()) || value.trim().length > (key.includes('full_name') || key.includes('signature') ? NAME_FULL_MAX : NAME_PART_MAX))
    );
    if (invalidName) return 'Name fields can only contain letters, spaces, apostrophes, dots, or hyphens and must stay within the character limit.';

    return 'Some required information is missing or invalid. Please review the form fields and try again.';
  }

  if (/duplicate key|already exists|already registered|already in use/i.test(text)) {
    return 'This information already exists in the system. Please review the details and try again.';
  }

  return text || 'Something went wrong while submitting your request. Please try again.';
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
      return new Response(JSON.stringify({ error: friendlyDatabaseError(error.message, payload) }), {
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
