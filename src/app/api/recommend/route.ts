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

  // Fetch user's highly rated movies (rating >= 7)
  const { data: movies, error } = await supabase
    .from('user_movies')
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
    return NextResponse.json({ recommendations: parsed.recommendations })
  } catch (error: any) {
    console.error('OpenAI Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
