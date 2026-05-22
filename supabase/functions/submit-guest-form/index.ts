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
])

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
