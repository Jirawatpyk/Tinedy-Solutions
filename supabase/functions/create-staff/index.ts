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
      throw new Error('Only admins and managers can create staff members')
    }

    // Get request body
    const { email, password, full_name, phone, role, staff_number, skills } = await req.json()

    console.log('[Create Staff] Received request body:', {
      email,
      full_name,
      skills,
      skillsType: typeof skills,
      skillsIsArray: Array.isArray(skills),
      skillsLength: Array.isArray(skills) ? skills.length : 'N/A',
    })

    if (!email || !password || !full_name) {
      throw new Error('Missing required fields: email, password, full_name')
    }

    // Create the new user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
      },
    })

    if (createError) {
      // Check for duplicate email error from Auth API
      const errorMsg = createError.message.toLowerCase()
      if (errorMsg.includes('user already registered') ||
          errorMsg.includes('already exists') ||
          errorMsg.includes('already registered') ||
          errorMsg.includes('duplicate')) {
        throw new Error('This email is already registered. Please use a different email.')
      }
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Failed to create user')
    }

    // Create profile for the new user
    const profileData = {
      id: newUser.user.id,
      email,
      full_name,
      phone: phone || null,
      role: role || 'staff',
      staff_number: staff_number || null,
      skills: Array.isArray(skills) && skills.length > 0 ? skills : null,
    }

    console.log('[Create Staff] Inserting profile:', profileData)

    const { error: profileError } = await supabaseAdmin.from('profiles').insert(profileData)

    if (profileError) {
      // If profile creation fails, delete the user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)

      // Check for duplicate staff_number error
      if (profileError.code === '23505') {
        if (profileError.message.toLowerCase().includes('staff_number')) {
          throw new Error('This staff number is already in use. Please use a different staff number.')
        }
        if (profileError.message.toLowerCase().includes('email')) {
          throw new Error('This email is already registered. Please use a different email.')
        }
      }

      throw profileError
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
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
