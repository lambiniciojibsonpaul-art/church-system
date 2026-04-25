import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Added 'Request' type to the req parameter to fix the "implicit any" error
serve(async (req: Request) => {
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, role } = await req.json()

    // Create Supabase Client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create the user
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    })

    if (authError) throw authError

    // Update role and password flag
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: role, requires_password_change: true })
      .eq('user_id', data.user.id)

    if (roleError) throw roleError

    return new Response(
      JSON.stringify({ message: "User created successfully" }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    )

  } catch (err: any) { // Added ': any' to fix the "'error' is of type unknown" error
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    )
  }
})