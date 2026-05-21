import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { email, password, role, first_name, last_name, contact_number, ministries } = body;

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

    // Create auth user
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        requires_password_change: true,
        full_name: `${first_name || ''} ${last_name || ''}`.trim(),
      }
    });

    if (authError) throw authError;

    const newUserId = data.user.id;
    const normalizedRole = role ? role.toLowerCase() : 'parishioner';

    // Set role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: newUserId, role: normalizedRole },
        { onConflict: 'user_id' }
      );
    if (roleError) throw roleError;

    // Save profile — using service role key bypasses RLS so name/details are always stored
    const profilePayload: Record<string, unknown> = {
      id: newUserId,
      email,
      first_name: first_name || '',
      last_name: last_name || '',
      contact_number: contact_number || '',
    };
    if (normalizedRole === 'minister' && Array.isArray(ministries) && ministries.length > 0) {
      profilePayload.ministries = ministries;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileError) {
      console.error("[create-user] profile upsert failed:", profileError.message);
      // Non-fatal: role was created; log but continue so the caller still gets the user ID
    }

    // If priest, add to priests table
    if (normalizedRole === 'priest') {
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();
      const { error: priestError } = await supabaseAdmin
        .from('priests')
        .upsert({ user_id: newUserId, name: fullName, is_active: true }, { onConflict: 'user_id' });
      if (priestError) console.error("[create-user] priests upsert failed:", priestError.message);
    }

    return new Response(
      JSON.stringify({ message: "User created successfully", user: data.user }),
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
