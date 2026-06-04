import { type Media, resolveMediaUrl } from '@/services/media.service'
import { Play } from 'lucide-react'

interface MediaGalleryProps {
  media: Media[]
  variant?: 'feed' | 'detail' | 'inline'
  onItemClick?: (m: Media) => void
}

export default function MediaGallery({ media, variant = 'feed', onItemClick }: MediaGalleryProps) {
  if (!media || media.length === 0) return null

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-2">
        {media.map((m) => (
          <MediaThumb key={m.id} media={m} onClick={() => onItemClick?.(m)} maxHeight={220} />
        ))}
      </div>
    )
  }

  const cols = media.length === 1 ? 1 : 2
  return (
    <div
      className={`grid gap-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 ${
        cols === 1 ? 'grid-cols-1' : 'grid-cols-2'
      }`}
    >
      {media.map((m) => (
        <MediaThumb
          key={m.id}
          media={m}
          onClick={() => onItemClick?.(m)}
          maxHeight={variant === 'detail' ? 480 : 360}
        />
      ))}
    </div>
  )
}

interface ThumbProps {
  media: Media
  onClick?: () => void
  maxHeight?: number
}

function MediaThumb({ media, onClick, maxHeight = 360 }: ThumbProps) {
  const src = resolveMediaUrl(media.thumbnail_url || media.url)
  const fullSrc = resolveMediaUrl(media.url)

  if (media.media_type === 'video') {
    return (
      <div
        className="relative bg-black flex items-center justify-center cursor-pointer overflow-hidden"
        style={{ maxHeight }}
        onClick={onClick}
      >
        <video
          src={fullSrc}
          controls
          preload="metadata"
          className="max-w-full max-h-full"
          style={{ maxHeight }}
        />
        {!onClick && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0">
            <Play className="h-10 w-10 text-white drop-shadow" />
          </div>
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={media.media_type === 'gif' ? 'GIF' : 'Attached image'}
      loading="lazy"
      onClick={onClick}
      className="w-full object-cover cursor-pointer"
      style={{ maxHeight }}
    />
  )
}
