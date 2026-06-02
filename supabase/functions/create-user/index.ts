import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ' .-]+$/;
const CONTACT_RE = /^\d{11}$/;
const NAME_MAX = 60;
const ALLOWED_ROLES = new Set(['parishioner', 'staff', 'minister', 'priest', 'admin', 'superadmin', 'ministry']);

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/\d/.test(password)) return "Password must include a number.";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return "Password must include a special character.";
  }
  return null;
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

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const roleInput = String(body.role || 'parishioner').trim().toLowerCase();
    const first_name = String(body.first_name || '').trim();
    const last_name = String(body.last_name || '').trim();
    const contact_number = String(body.contact_number || '').trim();
    const ministries = body.ministries;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return new Response(
        JSON.stringify({ error: passwordError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (first_name && !NAME_RE.test(first_name)) {
      return new Response(
        JSON.stringify({ error: "First name must contain letters only." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (first_name.length > NAME_MAX) {
      return new Response(
        JSON.stringify({ error: `First name must be ${NAME_MAX} characters or less.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (last_name && !NAME_RE.test(last_name)) {
      return new Response(
        JSON.stringify({ error: "Last name must contain letters only." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (last_name.length > NAME_MAX) {
      return new Response(
        JSON.stringify({ error: `Last name must be ${NAME_MAX} characters or less.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (contact_number && !CONTACT_RE.test(contact_number)) {
      return new Response(
        JSON.stringify({ error: "Contact number must be exactly 11 digits." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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

    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;
    if (existingProfile?.id) {
      return new Response(
        JSON.stringify({ error: "This email is already in use. Please use a different email address." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

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

    if (authError) {
      if (/already|exists|registered/i.test(authError.message || "")) {
        return new Response(
          JSON.stringify({ error: "This email is already in use. Please use a different email address." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }
      throw authError;
    }

    const newUserId = data.user.id;
    const normalizedRole = ALLOWED_ROLES.has(roleInput) ? roleInput : 'parishioner';

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
