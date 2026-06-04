import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Search, X } from 'lucide-react'
import { type GiphyResult, type Media, mediaService } from '@/services/media.service'

interface GifPickerProps {
  open: boolean
  onClose: () => void
  onPick: (media: Media) => void
  // The button (or any element) that toggles the picker. Used to compute
  // placement and to treat clicks on it as "inside" the picker so the
  // outside-click handler doesn't immediately close on toggle.
  triggerRef: RefObject<HTMLElement | null>
  // Roughly how tall the picker is on screen. Used by the auto-flip logic
  // to decide between placing the picker above or below the trigger.
  estimatedHeight?: number
  width?: number
  // Horizontal alignment relative to the trigger. Defaults to "end" (right edge).
  align?: 'start' | 'end'
}

interface Placement {
  top: number
  left: number
  maxHeight: number
}

const VIEWPORT_PADDING = 8

export default function GifPicker({
  open,
  onClose,
  onPick,
  triggerRef,
  estimatedHeight = 380,
  width = 320,
  align = 'end',
}: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GiphyResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAttaching, setIsAttaching] = useState<string | null>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load trending on open
  useEffect(() => {
    if (!open) return
    setQuery('')
    setIsLoading(true)
    mediaService
      .giphyTrending(20)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false))
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!open) return
    const term = query.trim()
    if (!term) return
    const handle = setTimeout(() => {
      setIsLoading(true)
      mediaService
        .giphySearch(term, 20)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [query, open])

  // Compute placement: prefer below the trigger if room, else flip above.
  // Horizontal placement is constrained to the viewport with a small gutter.
  const computePlacement = (): Placement | null => {
    const trigger = triggerRef.current
    if (!trigger) return null
    const rect = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const gap = 6
    const spaceBelow = vh - rect.bottom - VIEWPORT_PADDING - gap
    const spaceAbove = rect.top - VIEWPORT_PADDING - gap

    // Open below by default if there's enough room or if there's more room
    // below than above. Otherwise flip up.
    const openBelow = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove
    const availableHeight = Math.max(160, openBelow ? spaceBelow : spaceAbove)
    const useHeight = Math.min(estimatedHeight, availableHeight)

    const top = openBelow ? rect.bottom + gap : rect.top - gap - useHeight

    // Horizontal: align edge to trigger; clamp inside viewport.
    let left: number
    if (align === 'start') {
      left = rect.left
    } else {
      left = rect.right - width
    }
    left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - width - VIEWPORT_PADDING))

    return { top, left, maxHeight: useHeight }
  }

  // Place on open + reposition on resize/scroll while open.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null)
      return
    }
    const update = () => setPlacement(computePlacement())
    update()
    window.addEventListener('resize', update)
    // Capture true: catch scrolls in any scrollable ancestor (e.g. message list).
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Outside click — but treat clicks on the trigger as inside, so a second
  // tap on the trigger toggles the picker via the caller's handler instead of
  // double-firing close + reopen.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose, triggerRef])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !placement) return null

  const handlePick = async (gif: GiphyResult) => {
    setIsAttaching(gif.id)
    try {
      const media = await mediaService.attachGiphy(gif)
      onPick(media)
      onClose()
    } catch {
      setIsAttaching(null)
    }
  }

  // Scrollable results area gets whatever's left after the header + search +
  // footer (~160px combined). Keep a sane minimum so the grid isn't useless.
  const resultsMaxHeight = Math.max(120, placement.maxHeight - 160)

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: placement.top,
        left: placement.left,
        width,
        maxHeight: placement.maxHeight,
      }}
      className="z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-3 flex flex-col"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">GIFs</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close GIF picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIPHY"
          className="w-full bg-slate-100 dark:bg-slate-800 text-sm rounded-md pl-8 pr-2 py-1.5 outline-none border border-transparent focus:border-blue-500"
        />
      </div>
      <div
        className="overflow-y-auto"
        style={{ maxHeight: resultsMaxHeight }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">No GIFs found</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                disabled={isAttaching !== null}
                onClick={() => handlePick(gif)}
                className="relative aspect-square rounded-md overflow-hidden bg-slate-200 dark:bg-slate-800 hover:ring-2 hover:ring-blue-500 disabled:opacity-50"
              >
                <img
                  src={gif.thumbnail_url || gif.url}
                  alt={gif.title || 'GIF'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isAttaching === gif.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] text-slate-400 text-center">Powered by GIPHY</p>
    </div>,
    document.body,
  )
}
