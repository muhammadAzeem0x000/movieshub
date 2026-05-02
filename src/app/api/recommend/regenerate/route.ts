import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Soft delete current active recommendations by marking them as 'dismissed'
  const { error } = await supabase
    .from('user_recommendations')
    .update({ status: 'dismissed' })
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: 'Failed to clear old recommendations' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
