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

  // Fetch the full watched list with tmdb_id for blocklist deduplication
  const { data: movies, error } = await supabase
    .from('user_media')
    .select('title, user_rating, review, media_type, tmdb_id')
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }

  if (!movies || movies.length === 0) {
    return NextResponse.json({ error: 'Not enough titles to generate recommendations.' }, { status: 400 })
  }

  // Build blocklist: set of tmdb_ids AND normalized titles the user has already watched
  const watchedTmdbIds = new Set(movies.map(m => m.tmdb_id).filter(Boolean))
  const watchedTitlesNormalized = new Set(movies.map(m => m.title.toLowerCase().trim()))

  const movieItems = movies.filter(m => m.media_type === 'movie')
  const tvItems = movies.filter(m => m.media_type === 'tv')

  const formatList = (items: typeof movies) => items.map(m => {
    let line = `- "${m.title}"`
    if (m.user_rating) line += ` (User rating: ${m.user_rating}/10)`
    if (m.review) line += ` — Review: "${m.review}"`
    return line
  }).join('\n')

  const movieList = formatList(movieItems)
  const tvList = formatList(tvItems)

  // Build the exclusion list as a simple comma-separated string for the prompt
  const allWatchedTitles = movies.map(m => `"${m.title}"`).join(', ')

  // ── Refined system prompt with persona, role, and output constraints ──
  const systemPrompt = `You are a world-class film and television recommendation engine.

Your role:
- Analyze the user's watch history, ratings, and reviews to understand their taste profile.
- Identify patterns in genres, themes, directors, actors, tone, and pacing the user gravitates toward.
- Generate highly personalized, diverse recommendations the user has NOT already seen.

Output rules:
- You MUST respond with valid JSON only — no markdown, no commentary, no explanation outside the JSON.
- The JSON must have a single key "recommendations" containing an array of exactly 20 objects.
- Each object must have these exact keys: "title" (string), "media_type" ("movie" or "tv"), "reason" (string, 1-2 sentences), "tmdb_id" (number or 0).
- The first 10 items MUST have media_type "movie". The last 10 MUST have media_type "tv".`

  // ── Refined user prompt using structured sections ──
  const userPrompt = `## TASK
Recommend exactly 20 titles (10 movies + 10 TV shows) based on my watch history below.

## MY WATCH HISTORY

### Movies I've watched (${movieItems.length}):
${movieList || '(none yet)'}

### TV Shows I've watched (${tvItems.length}):
${tvList || '(none yet)'}

## EXCLUSION LIST — DO NOT RECOMMEND ANY OF THESE
The following titles are STRICTLY FORBIDDEN from appearing in your recommendations. I have already watched all of them:
${allWatchedTitles}

## RECOMMENDATION GUIDELINES
1. **No duplicates**: Never recommend anything from the exclusion list above. Not even with a slightly different title.
2. **Taste matching**: Weight higher-rated titles more heavily when inferring my preferences. Pay close attention to my reviews — they reveal what I specifically liked or disliked.
3. **Diversity**: Vary your suggestions across sub-genres, decades, and countries. Don't cluster all 10 movies in the same niche.
4. **Quality**: Prioritize critically acclaimed or highly regarded titles that match my taste — avoid obscure filler.
5. **Recency bias**: Include a mix of classics and recent releases (post-2020).

## OUTPUT FORMAT
Return ONLY a JSON object:
{
  "recommendations": [
    { "title": "...", "media_type": "movie", "reason": "...", "tmdb_id": 0 },
    ... (10 movies, then 10 TV shows — 20 total)
  ]
}`

  // Build debug payload for frontend visibility
  const debugPayload = {
    totalTitles: movies.length,
    movieCount: movieItems.length,
    tvCount: tvItems.length,
    moviesSent: movieItems.map(m => ({ title: m.title, tmdb_id: m.tmdb_id, rating: m.user_rating || null, hasReview: !!m.review })),
    tvShowsSent: tvItems.map(m => ({ title: m.title, tmdb_id: m.tmdb_id, rating: m.user_rating || null, hasReview: !!m.review })),
    promptSent: userPrompt,
    systemPromptSent: systemPrompt,
    blocklist: Array.from(watchedTitlesNormalized),
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
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
        // Prefer matching the AI's requested media_type for better accuracy
        const searchType = rec.media_type === 'tv' ? 'tv' : 'movie'
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`)
        const searchData = await searchRes.json()
        if (searchData.results && searchData.results.length > 0) {
          const match = searchData.results[0]
          if (match) {
            return {
              ...rec,
              tmdb_id: match.id,
              poster_path: match.poster_path,
              media_type: searchType,
              title: match.title || match.name
            }
          }
        }
      } catch (e) {
        console.error('Failed to enrich recommendation', rec.title, e)
      }
      return { ...rec, media_type: rec.media_type || 'movie', poster_path: null, tmdb_id: rec.tmdb_id || 0 }
    }))

    // ── PROGRAMMATIC DEDUPLICATION: Remove any recommendation that matches a watched title ──
    const deduplicatedRecs = enrichedRecs.filter(rec => {
      // Check by tmdb_id (most reliable)
      if (rec.tmdb_id && watchedTmdbIds.has(rec.tmdb_id)) {
        console.log(`[Dedup] Removed "${rec.title}" — tmdb_id ${rec.tmdb_id} is in watched list`)
        return false
      }
      // Check by normalized title (fallback safety net)
      if (watchedTitlesNormalized.has(rec.title?.toLowerCase().trim())) {
        console.log(`[Dedup] Removed "${rec.title}" — title match in watched list`)
        return false
      }
      return true
    })

    // Save deduplicated recommendations to the database
    const rowsToInsert = deduplicatedRecs.map(rec => ({
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
    const allActive = [...(activeRecs || []), ...deduplicatedRecs]

    return NextResponse.json({ recommendations: allActive, debug: debugPayload })
  } catch (error: any) {
    console.error('OpenAI Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
