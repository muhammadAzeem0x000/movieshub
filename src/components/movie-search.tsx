'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, Loader2, Film } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'

interface MovieResult {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}

interface MovieSearchProps {
  onSelectMovie: (movie: MovieResult) => void
}

export function MovieSearch({ onSelectMovie }: MovieSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 500)
  const [results, setResults] = useState<MovieResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      return
    }

    async function searchMovies() {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        if (data.results) {
          setResults(data.results.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to search movies', error)
      } finally {
        setLoading(false)
      }
    }

    searchMovies()
  }, [debouncedQuery])

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for a movie..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute z-10 w-full mt-1 overflow-hidden">
          <CardContent className="p-0 max-h-[300px] overflow-y-auto">
            {results.map((movie) => (
              <div
                key={movie.id}
                onClick={() => {
                  onSelectMovie(movie)
                  setShowResults(false)
                  setQuery('')
                }}
                className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors border-b last:border-b-0"
              >
                {movie.poster_path ? (
                  <div className="relative w-10 h-14 bg-muted flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      alt={movie.title}
                      className="object-cover w-full h-full rounded-sm"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-14 bg-muted rounded-sm flex items-center justify-center flex-shrink-0">
                    <Film className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm line-clamp-1">{movie.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown Year'}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
