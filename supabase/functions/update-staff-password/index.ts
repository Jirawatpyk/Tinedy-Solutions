import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if the user is an admin or manager
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'manager') {
      throw new Error('Only admins and managers can update staff passwords')
    }

    // Get request body
    const { user_id, new_password } = await req.json()

    console.log('[Update Staff Password] Received request:', {
      user_id,
      requested_by: user.id,
      requested_by_role: profile?.role,
    })

    if (!user_id || !new_password) {
      throw new Error('Missing required fields: user_id, new_password')
    }

    // Validate password length
    if (new_password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    // Update the user's password using admin API
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        password: new_password,
      }
    )

    if (updateError) {
      console.error('[Update Staff Password] Error:', updateError)
      throw updateError
    }

    if (!updatedUser.user) {
      throw new Error('Failed to update user password')
    }

    console.log('[Update Staff Password] Success:', {
      user_id,
      updated_by: user.id,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Update Staff Password] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
