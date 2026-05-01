'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Star, Film } from 'lucide-react'
import { toast } from 'sonner'
import { saveMedia } from '@/app/actions/media'

interface MediaModalProps {
  mediaId: number | null
  mediaType: 'movie' | 'tv' | null
  initialData?: { rating?: number, review?: string } | null
  isOpen: boolean
  onClose: () => void
}

export function MovieModal({ mediaId, mediaType, initialData, isOpen, onClose }: MediaModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mediaDetails, setMediaDetails] = useState<any>(null)
  const [rating, setRating] = useState<number>(0)
  const [review, setReview] = useState('')

  useEffect(() => {
    if (isOpen && mediaId && mediaType) {
      setRating(initialData?.rating || 0)
      setReview(initialData?.review || '')
      setMediaDetails(null)
      fetchDetails(mediaId, mediaType)
    }
  }, [isOpen, mediaId, mediaType, initialData])

  async function fetchDetails(id: number, type: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/media?id=${id}&type=${type}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMediaDetails(data)
    } catch (error: any) {
      toast.error('Failed to load media details: ' + error.message)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!mediaDetails || !mediaType) return

    setSaving(true)
    const genres = mediaDetails.genres.map((g: any) => g.name)
    const result = await saveMedia({
      tmdb_id: mediaDetails.id,
      media_type: mediaType,
      title: mediaDetails.title || mediaDetails.name,
      poster_path: mediaDetails.poster_path,
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
        ) : mediaDetails ? (
          <div className="grid gap-6 py-4">
            <div className="flex gap-4">
              {mediaDetails.poster_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://image.tmdb.org/t/p/w154${mediaDetails.poster_path}`}
                  alt={mediaDetails.title || mediaDetails.name}
                  className="w-24 h-36 object-cover rounded-md shadow-md"
                />
              ) : (
                <div className="w-24 h-36 bg-muted rounded-md flex items-center justify-center shadow-md">
                  <Film className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg leading-tight">{mediaDetails.title || mediaDetails.name}</h3>
                  <span className="text-[10px] uppercase font-semibold bg-primary/10 text-primary px-1.5 rounded-sm">
                    {mediaType}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {(mediaDetails.release_date || mediaDetails.first_air_date) ? new Date(mediaDetails.release_date || mediaDetails.first_air_date).getFullYear() : 'Unknown'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {mediaDetails.genres?.slice(0, 3).map((g: any) => (
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
          <Button onClick={handleSave} disabled={loading || saving || !mediaDetails}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Title' : 'Save Title'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
