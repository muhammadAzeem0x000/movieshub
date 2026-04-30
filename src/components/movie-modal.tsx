'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Star, Film } from 'lucide-react'
import { toast } from 'sonner'
import { saveMovie } from '@/app/actions/movie'

interface MovieModalProps {
  movieId: number | null
  isOpen: boolean
  onClose: () => void
}

export function MovieModal({ movieId, isOpen, onClose }: MovieModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [movieDetails, setMovieDetails] = useState<any>(null)
  const [rating, setRating] = useState<number>(0)
  const [review, setReview] = useState('')

  useEffect(() => {
    if (isOpen && movieId) {
      setRating(0)
      setReview('')
      setMovieDetails(null)
      fetchDetails(movieId)
    }
  }, [isOpen, movieId])

  async function fetchDetails(id: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/movie?id=${id}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMovieDetails(data)
    } catch (error: any) {
      toast.error('Failed to load movie details: ' + error.message)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!movieDetails) return

    setSaving(true)
    const genres = movieDetails.genres.map((g: any) => g.name)
    const result = await saveMovie({
      tmdb_id: movieDetails.id,
      title: movieDetails.title,
      poster_path: movieDetails.poster_path,
      genres,
      user_rating: rating > 0 ? rating : undefined,
      review: review.trim() || undefined,
    })

    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Movie saved to your list!')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark as Watched</DialogTitle>
          <DialogDescription>
            Rate and review this movie to add it to your personal list.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : movieDetails ? (
          <div className="grid gap-6 py-4">
            <div className="flex gap-4">
              {movieDetails.poster_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://image.tmdb.org/t/p/w154${movieDetails.poster_path}`}
                  alt={movieDetails.title}
                  className="w-24 h-36 object-cover rounded-md shadow-md"
                />
              ) : (
                <div className="w-24 h-36 bg-muted rounded-md flex items-center justify-center shadow-md">
                  <Film className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg leading-tight mb-1">{movieDetails.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {movieDetails.release_date ? new Date(movieDetails.release_date).getFullYear() : 'Unknown'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {movieDetails.genres?.slice(0, 3).map((g: any) => (
                    <span key={g.id} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Your Rating (1-10)</Label>
              <div className="flex gap-1 items-center justify-between">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none focus:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating >= star ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-center text-sm font-medium h-4 text-muted-foreground">
                {rating > 0 ? `${rating} / 10` : 'Optional'}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="review">Review / Notes</Label>
              <Textarea
                id="review"
                placeholder="What did you think?"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="resize-none h-24"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving || !movieDetails}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Movie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
