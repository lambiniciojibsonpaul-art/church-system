import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. HANDLE CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.target_user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required." }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { target_user_id } = body;

    // 2. SETUP ADMIN CLIENT
    const sUrl = Deno.env.get('SUPABASE_URL');
    const sKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!sUrl || !sKey) {
      throw new Error("Server configuration error: Missing API keys.");
    }

    const supabaseAdmin = createClient(sUrl, sKey);

    // 3. DELETE USER SAFELY VIA ADMIN API
    // This safely cascades the deletion through all internal Supabase auth tables
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ message: "User safely deleted" }), 
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