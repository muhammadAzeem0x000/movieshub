import { NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') // 'movie' or 'tv'

  if (!id || !type) {
    return NextResponse.json({ error: 'Parameters "id" and "type" are required' }, { status: 400 })
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB API key is missing' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type === 'tv' ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&language=en-US`
    )

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
