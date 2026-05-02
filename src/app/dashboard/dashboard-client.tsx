'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MovieSearch } from '@/components/movie-search'
import { MovieModal } from '@/components/movie-modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Star, Filter, ArrowUpDown, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardClient({ initialMovies }: { initialMovies: any[] }) {
  const router = useRouter()
  const [movies, setMovies] = useState(initialMovies)
  
  useEffect(() => {
    setMovies(initialMovies)
  }, [initialMovies])

  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null)
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv' | null>(null)
  const [selectedMediaData, setSelectedMediaData] = useState<{ rating?: number, review?: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [genreFilter, setGenreFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<'All' | 'movie' | 'tv'>('All')
  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent')

  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [visibleRecsCount, setVisibleRecsCount] = useState(5)

  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const res = await fetch('/api/recommend')
      const data = await res.json()
      if (data.recommendations) {
        setRecommendations(data.recommendations)
      } else if (data.error) {
        console.error('Error fetching recs:', data.error)
      }
    } catch (error) {
      console.error('Failed to get recs', error)
    } finally {
      setLoadingRecs(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const regenerateRecommendations = async () => {
    setLoadingRecs(true)
    try {
      await fetch('/api/recommend/regenerate', { method: 'POST' })
      await fetchRecommendations()
      setVisibleRecsCount(5)
    } catch (error) {
      console.error('Failed to regenerate recs', error)
      setLoadingRecs(false)
    }
  }

  const handleSelectMedia = (media: any) => {
    // media.tmdb_id exists if it comes from the DB, media.id is the TMDB ID if it comes from the search API
    setSelectedMediaId(media.tmdb_id || media.id)
    setSelectedMediaType(media.media_type)
    
    // Check if it's an existing record from the DB
    if (media.user_rating !== undefined || media.review !== undefined) {
      setSelectedMediaData({ rating: media.user_rating, review: media.review })
    } else {
      setSelectedMediaData(null)
    }
    
    setIsModalOpen(true)
  }

  const allGenres = useMemo(() => {
    const genres = new Set<string>()
    movies.forEach(m => m.genres?.forEach((g: string) => genres.add(g)))
    return ['All', ...Array.from(genres)]
  }, [movies])

  const filteredAndSortedMovies = useMemo(() => {
    let result = [...movies]

    if (typeFilter !== 'All') {
      result = result.filter(m => m.media_type === typeFilter)
    }

    if (genreFilter !== 'All') {
      result = result.filter(m => m.genres?.includes(genreFilter))
    }

    if (sortBy === 'rating') {
      result.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
    } else {
      result.sort((a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime())
    }

    return result
  }, [movies, typeFilter, genreFilter, sortBy])

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <section className="bg-card p-6 rounded-lg border shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <h2 className="text-2xl font-bold mb-6">Log a New Movie or TV Show</h2>
        <MovieSearch onSelectMedia={handleSelectMedia} />
      </section>

      {/* AI Recommendations Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Suggested for You</h2>
          <Button onClick={regenerateRecommendations} disabled={loadingRecs} variant="outline">
            {loadingRecs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Regenerate Recommendations
          </Button>
        </div>
        
        {recommendations.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {recommendations.slice(0, visibleRecsCount).map((rec, i) => (
                <Card key={rec.id || i} className="flex flex-col overflow-hidden group">
                  <div className="aspect-[2/3] w-full bg-muted relative overflow-hidden">
                    {rec.poster_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://image.tmdb.org/t/p/w342${rec.poster_path}`} alt={rec.title} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {rec.media_type && (
                      <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {rec.media_type}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 flex flex-col h-full gap-2 bg-card">
                    <h3 className="font-semibold text-lg line-clamp-1" title={rec.title}>{rec.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-4 flex-grow">{rec.reason}</p>
                    <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => handleSelectMedia({ id: rec.tmdb_id, title: rec.title, media_type: rec.media_type })}>
                      Log this
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {recommendations.length > visibleRecsCount && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => setVisibleRecsCount(prev => prev + 5)}>
                  Show More
                </Button>
              </div>
            )}
          </>
        )}
        {recommendations.length === 0 && !loadingRecs && (
          <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
            Click &quot;Regenerate Recommendations&quot; to get AI recommendations based on your highly rated titles.
          </div>
        )}
        {recommendations.length === 0 && loadingRecs && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>

      {/* Movies Grid Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Your Watched Titles ({filteredAndSortedMovies.length})</h2>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-[140px]">
                <span className="flex items-center"><Filter className="mr-2 h-4 w-4" /> {typeFilter === 'All' ? 'All Types' : typeFilter === 'movie' ? 'Movies' : 'TV Shows'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter('All')}>All Types</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('movie')}>Movies</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('tv')}>TV Shows</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-[140px]">
                <span className="flex items-center"><Filter className="mr-2 h-4 w-4" /> {genreFilter}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                {allGenres.map(genre => (
                  <DropdownMenuItem key={genre} onClick={() => setGenreFilter(genre)}>
                    {genre}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-[140px]">
                <span className="flex items-center"><ArrowUpDown className="mr-2 h-4 w-4" /> {sortBy === 'recent' ? 'Recent' : 'Rating'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('recent')}>Recent</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('rating')}>Rating</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAndSortedMovies.map(media => (
            <Card key={media.id} onClick={() => handleSelectMedia(media)} className="overflow-hidden relative group cursor-pointer">
              <div className="aspect-[2/3] bg-muted relative">
                {media.poster_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://image.tmdb.org/t/p/w342${media.poster_path}`} alt={media.title} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">No Image</div>
                )}
                <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider">
                  {media.media_type}
                </div>
                {media.user_rating && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 text-yellow-500 font-semibold text-sm">
                    <Star className="w-3 h-3 fill-current" />
                    {media.user_rating}
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold text-sm line-clamp-1">{media.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{media.genres?.slice(0,2).join(', ')}</p>
              </CardContent>
            </Card>
          ))}
          {filteredAndSortedMovies.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No titles found. Start logging some!
            </div>
          )}
        </div>
      </section>

      <MovieModal
        isOpen={isModalOpen}
        mediaId={selectedMediaId}
        mediaType={selectedMediaType}
        initialData={selectedMediaData}
        onClose={() => {
          setIsModalOpen(false)
          router.refresh()
          fetchRecommendations()
        }}
      />
    </div>
  )
}
