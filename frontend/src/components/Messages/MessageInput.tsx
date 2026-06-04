import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Image as ImageIcon, Loader2, Send, Smile, X } from 'lucide-react'
import GifPicker from '@/components/media/GifPicker'
import {
  classifyFile,
  mediaService,
  resolveMediaUrl,
  type Media,
} from '@/services/media.service'

interface MessageInputProps {
  onSendMessage: (message: string, mediaId?: string | null) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<Media | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const gifButtonRef = useRef<HTMLButtonElement>(null)

  const reset = () => {
    setMessage('')
    setAttachment(null)
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return
    const trimmed = message.trim()
    if (!trimmed && !attachment) return
    onSendMessage(trimmed, attachment?.id ?? null)
    reset()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return
    setError(null)
    const check = classifyFile(file)
    if (check.error) {
      setError(check.error)
      return
    }
    setIsUploading(true)
    try {
      const uploaded = await mediaService.upload(file)
      setAttachment(uploaded)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Upload failed')
    } finally {
      setIsUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 relative"
    >
      {attachment && (
        <div className="mb-2 inline-block relative max-w-[200px]">
          {attachment.media_type === 'video' ? (
            <video
              src={resolveMediaUrl(attachment.url)}
              className="rounded-lg max-h-40 border border-slate-200 dark:border-slate-700"
              preload="metadata"
            />
          ) : (
            <img
              src={resolveMediaUrl(attachment.thumbnail_url || attachment.url)}
              alt=""
              className="rounded-lg max-h-40 object-cover border border-slate-200 dark:border-slate-700"
            />
          )}
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="absolute -top-2 -right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1"
            aria-label="Remove attachment"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 items-end">
        <label
          className={`cursor-pointer rounded-full h-11 w-11 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0 ${
            disabled || isUploading || attachment ? 'opacity-50 pointer-events-none' : ''
          }`}
          title="Attach image or video"
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={disabled || !!attachment}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        <button
          ref={gifButtonRef}
          type="button"
          onClick={() => setShowGif((v) => !v)}
          disabled={disabled || !!attachment}
          className="rounded-full h-11 w-11 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
          title="Add a GIF"
        >
          <Smile className="h-5 w-5" />
        </button>
        <GifPicker
          open={showGif}
          triggerRef={gifButtonRef}
          align="start"
          onClose={() => setShowGif(false)}
          onPick={(m) => setAttachment(m)}
        />

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="resize-none min-h-[44px] max-h-[120px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full px-4 py-3 focus-visible:ring-blue-500"
        />
        <Button
          type="submit"
          size="sm"
          disabled={(!message.trim() && !attachment) || disabled}
          className="rounded-full h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
