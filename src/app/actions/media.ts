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

  const { error } = await supabase
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

  if (error) {
    console.error('Failed to save movie:', error)
    return { error: 'Failed to save movie' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
