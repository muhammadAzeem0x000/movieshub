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
    .select('title, user_rating, review, media_type')
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }

  if (!movies || movies.length === 0) {
    return NextResponse.json({ error: 'Not enough titles to generate recommendations.' }, { status: 400 })
  }

  const movieItems = movies.filter(m => m.media_type === 'movie')
  const tvItems = movies.filter(m => m.media_type === 'tv')

  const formatList = (items: typeof movies) => items.map(m => {
    let line = `- ${m.title}`
    if (m.user_rating) line += ` (Rating: ${m.user_rating}/10)`
    if (m.review) line += ` | User's review: "${m.review}"`
    return line
  }).join('\n')

  const movieList = formatList(movieItems)
  const tvList = formatList(tvItems)

  // Build debug payload for frontend visibility
  const debugPayload = {
    totalTitles: movies.length,
    movieCount: movieItems.length,
    tvCount: tvItems.length,
    moviesSent: movieItems.map(m => ({ title: m.title, rating: m.user_rating || null, hasReview: !!m.review })),
    tvShowsSent: tvItems.map(m => ({ title: m.title, rating: m.user_rating || null, hasReview: !!m.review })),
  }

  const prompt = `
The user has watched the following MOVIES (${movieItems.length} total):
${movieList || '(none)'}

The user has also watched the following TV SHOWS (${tvItems.length} total):
${tvList || '(none)'}

Based on ALL the titles above, their ratings, and especially the user's reviews, recommend EXACTLY 20 titles:
- EXACTLY 10 MOVIES (media_type: "movie")
- EXACTLY 10 TV SHOWS (media_type: "tv")

CRITICAL RULES:
1. DO NOT recommend any title that is already in the user's watched list above.
2. You MUST return exactly 10 movies and exactly 10 TV shows - no more, no less.
3. Order them with movies first, then TV shows.

Format the output strictly as a JSON object with a key "recommendations" containing an array of 20 objects.
Each object must have the following keys:
- "title" (string): the movie or TV show title
- "media_type" (string): either "movie" or "tv"
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

    return NextResponse.json({ recommendations: allActive, debug: debugPayload })
  } catch (error: any) {
    console.error('OpenAI Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
