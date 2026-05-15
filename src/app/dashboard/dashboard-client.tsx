'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MovieSearch } from '@/components/movie-search'
import { MovieModal } from '@/components/movie-modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Star, Filter, ArrowUpDown, Loader2, Film, Sparkles, MoreVertical, Trash2, Edit, ChevronDown, ChevronUp, Bug } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteMedia } from '@/app/actions/media'
import { toast } from 'sonner'

export default function DashboardClient({ initialMovies, initialRecommendations = [] }: { initialMovies: any[], initialRecommendations?: any[] }) {
  const router = useRouter()
  const [movies, setMovies] = useState(initialMovies)
  
  useEffect(() => {
    setMovies(initialMovies)
  }, [initialMovies])

  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null)
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv' | null>(null)
  const [selectedMediaData, setSelectedMediaData] = useState<{ rating?: number, review?: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [initialModalMode, setInitialModalMode] = useState<'view' | 'edit'>('edit')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ id: number, title: string } | null>(null)
  
  const [genreFilter, setGenreFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<'All' | 'movie' | 'tv'>('All')
  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent')

  const [recommendations, setRecommendations] = useState<any[]>(initialRecommendations)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [visibleRecsCount, setVisibleRecsCount] = useState(5)
  const [recTypeFilter, setRecTypeFilter] = useState<'All' | 'movie' | 'tv'>('All')
  const [debugPayload, setDebugPayload] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [debugTab, setDebugTab] = useState<'data' | 'prompt' | 'blocklist'>('data')

  useEffect(() => {
    setRecommendations(initialRecommendations)
    if (initialRecommendations.length > 0 && initialRecommendations.length < 5) {
      // Auto-replenish in the background if we drop below 5
      fetchRecommendations()
    }
  }, [initialRecommendations])

  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const res = await fetch('/api/recommend')
      const data = await res.json()
      if (data.recommendations) {
        setRecommendations(data.recommendations)
      }
      if (data.debug) {
        setDebugPayload(data.debug)
      }
      if (data.error) {
        if (data.error !== "Not enough highly rated titles to generate recommendations.") {
          console.error('Error fetching recs:', data.error)
        }
      }
    } catch (error) {
      console.error('Failed to get recs', error)
    } finally {
      setLoadingRecs(false)
    }
  }

  useEffect(() => {
    if (initialRecommendations.length === 0) {
      fetchRecommendations()
    }
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

  const handleSelectMedia = (media: any, mode: 'view' | 'edit' = 'edit') => {
    // media.tmdb_id exists if it comes from the DB, media.id is the TMDB ID if it comes from the search API
    setSelectedMediaId(media.tmdb_id || media.id)
    setSelectedMediaType(media.media_type)
    
    // Check if it's an existing record from the DB
    if (media.user_rating !== undefined || media.review !== undefined) {
      setSelectedMediaData({ rating: media.user_rating, review: media.review })
    } else {
      setSelectedMediaData(null)
    }
    
    setInitialModalMode(mode)
    setIsModalOpen(true)
  }

  const confirmDelete = (e: React.MouseEvent, media: any) => {
    e.stopPropagation()
    setItemToDelete({ id: media.tmdb_id, title: media.title })
  }

  const executeDelete = async () => {
    if (!itemToDelete) return
    const id = itemToDelete.id
    setItemToDelete(null)
    setDeletingId(id)
    const result = await deleteMedia(id)
    if (result.error) toast.error(result.error)
    else toast.success('Title deleted successfully')
    setDeletingId(null)
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
      <section className="bg-gradient-to-br from-card to-primary/5 p-8 rounded-2xl border shadow-md flex flex-col items-center justify-center min-h-[200px]">
        <h2 className="text-3xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">Log a New Movie or TV Show</h2>
        <MovieSearch onSelectMedia={handleSelectMedia} />
      </section>

      {/* AI Recommendations Section */}
      <section className="bg-gradient-to-tr from-card to-blue-500/5 p-6 md:p-8 rounded-2xl border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">Suggested for You</h2>
          <Button onClick={regenerateRecommendations} disabled={loadingRecs} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-md hover:shadow-lg transition-all rounded-full px-6 font-semibold border-0">
            {loadingRecs ? <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" /> : <Sparkles className="mr-2 h-4 w-4 shrink-0" />}
            <span className="truncate">{loadingRecs ? "Regenerating..." : "Regenerate Recommendations"}</span>
          </Button>
        </div>

        {/* Category Filter Tabs */}
        {recommendations.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground mr-1">Filter:</span>
            {(['All', 'movie', 'tv'] as const).map(filterVal => {
              const count = filterVal === 'All'
                ? recommendations.length
                : recommendations.filter(r => r.media_type === filterVal).length
              const label = filterVal === 'All' ? 'All' : filterVal === 'movie' ? 'Movies' : 'TV Shows'
              return (
                <Button
                  key={filterVal}
                  variant={recTypeFilter === filterVal ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setRecTypeFilter(filterVal); setVisibleRecsCount(5) }}
                  className={`rounded-full text-xs px-4 h-7 font-semibold transition-all ${
                    recTypeFilter === filterVal
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-0 shadow-md'
                      : 'hover:bg-blue-500/10'
                  }`}
                >
                  {label} ({count})
                </Button>
              )
            })}
          </div>
        )}

        {/* Debug Panel */}
        {debugPayload && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                API Debug: {debugPayload.totalTitles} titles sent ({debugPayload.movieCount} movies, {debugPayload.tvCount} TV shows)
              </span>
              {showDebug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showDebug && (
              <div className="px-4 pb-4 space-y-3 border-t border-amber-500/20">
                {/* Debug Tab Buttons */}
                <div className="flex gap-1 pt-3">
                  {([
                    { key: 'data' as const, label: '📊 Data Sent' },
                    { key: 'prompt' as const, label: '📝 Prompt' },
                    { key: 'blocklist' as const, label: '🚫 Blocklist' },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDebugTab(tab.key)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        debugTab === tab.key
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-sm'
                          : 'text-muted-foreground hover:bg-amber-500/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Data Sent Tab */}
                {debugTab === 'data' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">🎬 Movies Sent ({debugPayload.movieCount})</h4>
                      {debugPayload.moviesSent?.length > 0 ? (
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                          {debugPayload.moviesSent.map((m: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-background/60 px-2.5 py-1.5 rounded border border-border/50">
                              <span className="truncate mr-2 font-medium">{m.title} <span className="text-muted-foreground">#{m.tmdb_id}</span></span>
                              <span className="shrink-0 flex items-center gap-1">
                                {m.rating ? <><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{m.rating}/10</> : <span className="text-muted-foreground">No rating</span>}
                                {m.hasReview && <span className="ml-1 text-blue-500" title="Has review">💬</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No movies in watched list</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">📺 TV Shows Sent ({debugPayload.tvCount})</h4>
                      {debugPayload.tvShowsSent?.length > 0 ? (
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                          {debugPayload.tvShowsSent.map((m: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-background/60 px-2.5 py-1.5 rounded border border-border/50">
                              <span className="truncate mr-2 font-medium">{m.title} <span className="text-muted-foreground">#{m.tmdb_id}</span></span>
                              <span className="shrink-0 flex items-center gap-1">
                                {m.rating ? <><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{m.rating}/10</> : <span className="text-muted-foreground">No rating</span>}
                                {m.hasReview && <span className="ml-1 text-blue-500" title="Has review">💬</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No TV shows in watched list</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Prompt Tab */}
                {debugTab === 'prompt' && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">System Prompt</h4>
                      <pre className="text-xs bg-background/60 p-3 rounded border border-border/50 whitespace-pre-wrap max-h-[200px] overflow-y-auto font-mono leading-relaxed">{debugPayload.systemPromptSent || 'N/A'}</pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">User Prompt</h4>
                      <pre className="text-xs bg-background/60 p-3 rounded border border-border/50 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono leading-relaxed">{debugPayload.promptSent || 'N/A'}</pre>
                    </div>
                  </div>
                )}

                {/* Blocklist Tab */}
                {debugTab === 'blocklist' && (
                  <div>
                    <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">🚫 Blocked Titles ({debugPayload.blocklist?.length || 0})</h4>
                    <p className="text-xs text-muted-foreground mb-2">These titles are programmatically removed from recommendations after OpenAI responds, even if the AI ignores the exclusion instruction.</p>
                    {debugPayload.blocklist?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 max-h-[300px] overflow-y-auto pr-2">
                        {debugPayload.blocklist.map((title: string, i: number) => (
                          <div key={i} className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 px-2.5 py-1.5 rounded border border-red-500/20 font-medium truncate" title={title}>
                            {title}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No blocklist available</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {recommendations.length > 0 && (() => {
          const filteredRecs = recTypeFilter === 'All'
            ? recommendations
            : recommendations.filter(r => r.media_type === recTypeFilter)
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredRecs.slice(0, visibleRecsCount).map((rec, i) => (
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
                  <CardContent className="p-3 flex flex-col flex-grow gap-2 bg-card">
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-1" title={rec.title}>{rec.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 sm:line-clamp-4">{rec.reason}</p>
                    <Button variant="default" size="sm" className="mt-auto w-full font-semibold shadow-sm" onClick={() => handleSelectMedia({ id: rec.tmdb_id, title: rec.title, media_type: rec.media_type })}>
                      Watched
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {(filteredRecs.length > visibleRecsCount || visibleRecsCount > 5) && (
              <div className="flex justify-center mt-4 gap-2">
                {filteredRecs.length > visibleRecsCount && (
                  <Button variant="outline" onClick={() => setVisibleRecsCount(prev => prev + 5)}>
                    Show More
                  </Button>
                )}
                {visibleRecsCount > 5 && (
                  <Button variant="outline" onClick={() => setVisibleRecsCount(5)}>
                    Show Less
                  </Button>
                )}
              </div>
            )}
          </>
          )
        })()}
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
      <section className="bg-gradient-to-br from-card to-green-500/5 p-6 md:p-8 rounded-2xl border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-green-500">Your Watched Titles ({filteredAndSortedMovies.length})</h2>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 w-full md:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-full sm:w-[130px] md:w-[140px]">
                <span className="flex items-center truncate"><Filter className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate ml-1">{typeFilter === 'All' ? 'All Types' : typeFilter === 'movie' ? 'Movies' : 'TV Shows'}</span></span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter('All')}>All Types</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('movie')}>Movies</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('tv')}>TV Shows</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-full sm:w-[130px] md:w-[140px]">
                <span className="flex items-center truncate"><Filter className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate ml-1">{genreFilter}</span></span>
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
              <DropdownMenuTrigger className="col-span-2 sm:col-span-1 inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-full sm:w-[130px] md:w-[140px]">
                <span className="flex items-center truncate"><ArrowUpDown className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate ml-1">{sortBy === 'recent' ? 'Recent' : 'Rating'}</span></span>
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
            <Card key={media.id} onClick={() => handleSelectMedia(media, 'view')} className={`overflow-hidden relative group cursor-pointer ${deletingId === media.tmdb_id ? 'opacity-50 pointer-events-none' : ''}`}>
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

                <div className="absolute top-2 right-2 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {deletingId === media.tmdb_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMedia(media, 'edit')
                      }}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={(e) => confirmDelete(e, media)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {media.user_rating && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 text-yellow-500 font-semibold text-sm">
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
        initialMode={initialModalMode}
        onClose={() => {
          setIsModalOpen(false)
          router.refresh()
        }}
      />

      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Title</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{itemToDelete?.title}" from your watched list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setItemToDelete(null)}>
              No, keep it
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
