import { useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Video, X } from 'lucide-react'
import {
  type Media,
  MEDIA_LIMITS,
  classifyFile,
  mediaService,
  resolveMediaUrl,
} from '@/services/media.service'

interface MediaUploaderProps {
  value: Media[]
  onChange: (next: Media[]) => void
  max?: number
  accept?: 'image' | 'image+video'
  disabled?: boolean
  label?: string
  compact?: boolean
}

export default function MediaUploader({
  value,
  onChange,
  max = 2,
  accept = 'image+video',
  disabled = false,
  label,
  compact = false,
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptStr =
    accept === 'image'
      ? MEDIA_LIMITS.allowedImage.join(',')
      : [...MEDIA_LIMITS.allowedImage, ...MEDIA_LIMITS.allowedVideo].join(',')

  const remaining = Math.max(0, max - value.length)
  const canAdd = !disabled && remaining > 0 && !isUploading

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)

    const picked = Array.from(files).slice(0, remaining)
    setIsUploading(true)
    try {
      const uploaded: Media[] = []
      for (const file of picked) {
        const check = classifyFile(file)
        if (check.error) {
          setError(check.error)
          continue
        }
        if (accept === 'image' && check.kind === 'video') {
          setError('Videos are not allowed here')
          continue
        }
        try {
          const media = await mediaService.upload(file)
          uploaded.push(media)
        } catch (e: any) {
          setError(e?.response?.data?.detail || 'Upload failed')
        }
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAt = (id: string) => {
    onChange(value.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">{label}</div>
      )}

      {value.length > 0 && (
        <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {value.map((m) => (
            <div
              key={m.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 group"
            >
              {m.media_type === 'video' ? (
                <video
                  src={resolveMediaUrl(m.url)}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              ) : (
                <img
                  src={resolveMediaUrl(m.thumbnail_url || m.url)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removeAt(m.id)}
                aria-label="Remove media"
                className="absolute top-1 right-1 rounded-full bg-black/60 hover:bg-black/80 text-white p-1 transition"
              >
                <X className="h-4 w-4" />
              </button>
              {m.media_type === 'video' && (
                <div className="absolute bottom-1 left-1 rounded bg-black/60 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                  <Video className="h-3 w-3" /> video
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAdd}
          className={
            compact
              ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition'
              : 'w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-500 transition'
          }
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin inline" />
          ) : (
            <>
              <ImageIcon className={compact ? 'h-4 w-4' : 'h-8 w-8 mx-auto mb-2 text-slate-400'} />
              {compact ? (
                <span>Photo / video</span>
              ) : (
                <>
                  <div className="text-slate-700 dark:text-slate-200 font-medium">
                    Add photos {accept === 'image+video' ? 'or videos' : ''}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Up to {max}{' '}
                    {accept === 'image+video' ? 'media (≤2MB image, ≤20MB video)' : 'images (≤2MB)'}
                    {' • '}
                    {value.length}/{max} used
                  </div>
                </>
              )}
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptStr}
        multiple={remaining > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={!canAdd}
      />

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
