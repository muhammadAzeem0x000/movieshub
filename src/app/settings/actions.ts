'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function exportData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_media')
    .select('*')
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to fetch data' }

  if (!data || data.length === 0) {
    return { error: 'No data to export' }
  }

  const headers = Object.keys(data[0]).join(',')
  const csv = data.map(row => 
    Object.values(row).map(v => {
      if (v === null || v === undefined) return '""'
      let strVal = ''
      if (Array.isArray(v)) {
        strVal = v.join(', ')
      } else if (typeof v === 'object') {
        strVal = JSON.stringify(v)
      } else {
        strVal = String(v)
      }
      return `"${strVal.replace(/"/g, '""')}"`
    }).join(',')
  ).join('\n')

  return { csv: `${headers}\n${csv}` }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // 1. Delete all user media (Though RLS and ON DELETE CASCADE should handle this)
  await supabase.from('user_media').delete().eq('user_id', user.id)

  // 2. Delete user from auth schema using service role key
  // This requires the SUPABASE_SERVICE_ROLE_KEY in the environment
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { error: 'Service role key not configured. Cannot delete account.' }
  }

  const adminAuthClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { error } = await adminAuthClient.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Failed to delete user:', error)
    return { error: 'Failed to delete account' }
  }

  // Ensure sign out after deletion
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}
