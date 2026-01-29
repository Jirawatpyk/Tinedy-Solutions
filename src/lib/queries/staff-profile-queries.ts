import { supabase } from '@/lib/supabase'

export async function changeStaffPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
}
