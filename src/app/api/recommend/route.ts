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

  // Check existing active recommendations
  const { data: activeRecs, error: recsError } = await supabase
    .from('user_recommendations')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (recsError) {
    return NextResponse.json({ error: 'Failed to fetch active recommendations' }, { status: 500 })
  }

  if (activeRecs && activeRecs.length >= 5) {
    return NextResponse.json({ recommendations: activeRecs })
  }

  // Not enough active recommendations, auto-generate 10 more
  const { data: movies, error } = await supabase
    .from('user_media')
    .select('title, genres, user_rating, review')
    .eq('user_id', user.id)
    .gte('user_rating', 6)
    .order('user_rating', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }

  if (!movies || movies.length === 0) {
    return NextResponse.json({ error: 'Not enough highly rated titles to generate recommendations.' }, { status: 400 })
  }

  const movieList = movies.map(m => {
    let line = `- ${m.title} (Rating: ${m.user_rating}/10, Genres: ${m.genres.join(', ')})`
    if (m.review) line += ` | User's review: "${m.review}"`
    return line
  }).join('\n')

  const prompt = `
The user has watched and rated the following titles:
${movieList}

Based on these titles, their genres, their ratings, and especially the user's reviews, recommend exactly 10 movies or TV shows they haven't watched yet. 
Format the output strictly as a JSON object with a key "recommendations" containing an array of objects.
Each object must have the following keys:
- "title" (string): the movie or TV show title
- "reason" (string): a short explanation of why they would like it based on their history
- "tmdb_id" (number): the TMDB ID of the title, or 0 if unknown
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a movie and TV show recommendation engine that outputs JSON.' },
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
          const match = searchData.results.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv') || searchData.results[0]
          if (match) {
            return {
              ...rec,
              tmdb_id: match.id,
              poster_path: match.poster_path,
              media_type: match.media_type || 'movie',
              title: match.title || match.name // TMDB normalizes it
            }
          }
        }
      } catch (e) {
        console.error('Failed to enrich recommendation', rec.title, e)
      }
      return { ...rec, media_type: 'movie', poster_path: null, tmdb_id: rec.tmdb_id || 0 } // fallback
    }))

    // Save enriched recommendations to the database
    const rowsToInsert = enrichedRecs.map(rec => ({
      user_id: user.id,
      tmdb_id: rec.tmdb_id,
      media_type: rec.media_type,
      title: rec.title,
      poster_path: rec.poster_path,
      reason: rec.reason,
      status: 'active'
    }))

    const { error: insertError } = await supabase
      .from('user_recommendations')
      .insert(rowsToInsert)

    if (insertError) {
      console.error('Failed to save recommendations to DB:', insertError)
    }

    // Combine existing active ones with the new ones
    const allActive = [...(activeRecs || []), ...enrichedRecs]

    return NextResponse.json({ recommendations: allActive })
  } catch (error: any) {
    console.error('OpenAI Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
