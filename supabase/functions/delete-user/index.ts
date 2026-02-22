import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase admin client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify caller's auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(token)

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only admin can delete users
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing userId parameter'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if user is a team lead
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('team_lead_id', userId)

    if (teamsError) {
      console.error('Error checking teams:', teamsError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to check team leadership status',
          details: teamsError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If user is a team lead, remove them from team_lead_id first
    if (teams && teams.length > 0) {
      const teamNames = teams.map(t => t.name).join(', ')
      console.log(`User is team lead of: ${teamNames}. Removing team_lead_id...`)

      const { error: updateError } = await supabase
        .from('teams')
        .update({ team_lead_id: null })
        .eq('team_lead_id', userId)

      if (updateError) {
        console.error('Error removing team lead:', updateError)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Cannot delete: This staff member is a team lead of: ${teamNames}`,
            details: 'Failed to automatically remove team lead assignment. Please remove them as team lead first.',
            teams: teams
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log(`Successfully removed ${userId} as team lead from ${teams.length} team(s)`)
    }

    // Check if user has bookings (optional warning)
    const { count: bookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', userId)

    if (bookingsCount && bookingsCount > 0) {
      console.log(`User has ${bookingsCount} bookings. Proceeding with deletion...`)
    }

    // Step 1: Delete from profiles first (Service Role bypasses RLS)
    console.log('Deleting profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      // Continue anyway - profile might not exist
    } else {
      console.log('✅ Profile deleted successfully')
    }

    // Step 2: Delete from auth.users
    console.log('Deleting user from auth.users...')
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      console.error('Full error object:', JSON.stringify(deleteError, null, 2))

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete user from authentication system',
          details: deleteError.message || String(deleteError),
          errorCode: deleteError.code || 'unknown',
          errorStatus: deleteError.status || 500,
          fullError: deleteError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User deleted successfully from auth.users:', userId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Staff member deleted successfully',
        userId: userId,
        removedFromTeams: teams && teams.length > 0 ? teams.map(t => t.name) : []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error in delete-user:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred while deleting the staff member',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
