import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Fetch user's highly rated media (rating >= 7)
  const { data: movies, error } = await supabase
    .from('user_media')
    .select('title, genres, user_rating')
    .eq('user_id', user.id)
    .gte('user_rating', 7)
    .order('user_rating', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }

  if (!movies || movies.length === 0) {
    return NextResponse.json({ error: 'Not enough highly rated movies to generate recommendations.' }, { status: 400 })
  }

  const movieList = movies.map(m => `${m.title} (Genres: ${m.genres.join(', ')})`).join('\n')

  const prompt = `
The user highly rates the following movies:
${movieList}

Based on these titles and their genres, recommend exactly 5 movies they haven't watched yet. 
Format the output strictly as a JSON object with a key "recommendations" containing an array of objects.
Each object must have the following keys:
- "title" (string): the movie title
- "reason" (string): a short explanation of why they would like it
- "tmdb_id" (number): the TMDB ID of the movie, or 0 if unknown (please try to get it right)
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a movie recommendation engine that outputs JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('No content from OpenAI')
    
    const parsed = JSON.parse(content)
    const rawRecommendations = parsed.recommendations || []

    const TMDB_API_KEY = process.env.TMDB_API_KEY
    const enrichedRecs = await Promise.all(rawRecommendations.map(async (rec: any) => {
      if (!TMDB_API_KEY) return rec
      try {
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`)
        const searchData = await searchRes.json()
        if (searchData.results && searchData.results.length > 0) {
          const match = searchData.results.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
          if (match) {
            return {
              ...rec,
              tmdb_id: match.id,
              poster_path: match.poster_path,
              media_type: match.media_type,
              title: match.title || match.name // TMDB normalizes it
            }
          }
        }
      } catch (e) {
        console.error('Failed to enrich recommendation', rec.title, e)
      }
      return { ...rec, media_type: 'movie' } // fallback
    }))

    return NextResponse.json({ recommendations: enrichedRecs })
  } catch (error: any) {
    console.error('OpenAI Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
