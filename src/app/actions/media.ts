'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveMedia(data: {
  tmdb_id: number
  media_type: string
  title: string
  poster_path: string | null
  genres: string[]
  user_rating?: number
  review?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: existing } = await supabase
    .from('user_media')
    .select('id')
    .eq('user_id', user.id)
    .eq('tmdb_id', data.tmdb_id)
    .maybeSingle()

  let error;

  if (existing) {
    const res = await supabase
      .from('user_media')
      .update({
        user_rating: data.user_rating || null,
        review: data.review || null,
      })
      .eq('id', existing.id)
    error = res.error
  } else {
    const res = await supabase
      .from('user_media')
      .insert({
        user_id: user.id,
        tmdb_id: data.tmdb_id,
        media_type: data.media_type,
        title: data.title,
        poster_path: data.poster_path,
        genres: data.genres,
        user_rating: data.user_rating || null,
        review: data.review || null,
      })
    error = res.error
  }

  if (error) {
    console.error('Failed to save movie:', error)
    return { error: 'Failed to save movie' }
  }

  // Also check if this item is in the user's active recommendations, and mark it as 'logged'
  await supabase
    .from('user_recommendations')
    .update({ status: 'logged' })
    .eq('user_id', user.id)
    .eq('tmdb_id', data.tmdb_id)
    .eq('status', 'active')

  revalidatePath('/dashboard')
  return { success: true }
}
