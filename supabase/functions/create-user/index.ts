import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. HANDLE CORS PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. VALIDATE INPUT
    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required." }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { email, password, role } = body;

    // 3. SETUP CLIENT (Check for keys)
    const sUrl = Deno.env.get('SUPABASE_URL');
    const sKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!sUrl || !sKey) {
      console.error("MISSING ENV VARS: Check Supabase Dashboard Settings");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API keys." }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(sUrl, sKey);

    // 4. CREATE USER
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    });

    if (authError) throw authError;

    // 5. UPDATE ROLE (Normalize to lowercase to match your SQL)
    const normalizedRole = role ? role.toLowerCase() : 'parishioner';

    // upsert (not update): guarantees the row exists even if no DB trigger
    // auto-inserts a user_roles record when an auth user is created.
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: data.user.id, role: normalizedRole, requires_password_change: true },
        { onConflict: 'user_id' }
      );

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ message: "User created successfully" }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    console.error("FUNCTION ERROR:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "An internal server error occurred." }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})