'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, Loader2, Film } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'

interface MediaResult {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  media_type: 'movie' | 'tv' | 'person'
}

interface MediaSearchProps {
  onSelectMedia: (media: MediaResult) => void
}

export function MovieSearch({ onSelectMedia }: MediaSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 500)
  const [results, setResults] = useState<MediaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      return
    }

    async function searchMedia() {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        if (data.results) {
          // Filter out people, only keep movie and tv
          const filtered = data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
          setResults(filtered.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to search movies', error)
      } finally {
        setLoading(false)
      }
    }

    searchMedia()
  }, [debouncedQuery])

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for movies or TV shows..."
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
            {results.map((media) => {
              const displayTitle = media.title || media.name
              const displayDate = media.release_date || media.first_air_date
              
              return (
                <div
                  key={media.id}
                  onMouseDown={(e) => {
                    // Prevent default to avoid input blur before click registers
                    e.preventDefault()
                    onSelectMedia(media)
                    setShowResults(false)
                    setQuery('')
                  }}
                  className="flex items-center gap-4 p-4 hover:bg-muted cursor-pointer transition-colors border-b last:border-b-0"
                >
                  {media.poster_path ? (
                    <div className="relative w-14 h-20 bg-muted flex-shrink-0 shadow-sm rounded-md overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://image.tmdb.org/t/p/w92${media.poster_path}`}
                        alt={displayTitle}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-20 bg-muted rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Film className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-base line-clamp-1">{displayTitle}</p>
                      <span className="text-[11px] uppercase font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-md">
                        {media.media_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {displayDate ? new Date(displayDate).getFullYear() : 'Unknown Year'}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
