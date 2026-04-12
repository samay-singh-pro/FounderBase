import { formatDate } from '@/utils/date'
import { Check, CheckCheck } from 'lucide-react'

interface MessageBubbleProps {
  content: string
  timestamp: string
  isSent: boolean
  isDelivered?: boolean
  isRead?: boolean
}

export function MessageBubble({ content, timestamp, isSent, isDelivered = false, isRead = false }: MessageBubbleProps) {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="flex flex-col max-w-[70%]">
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isSent
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
        <div className={`flex items-center gap-1 mt-1 px-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(timestamp)}
          </span>
          {isSent && (
            <span className="ml-1">
              {isRead ? (
                // Double check - Blue (Read)
                <CheckCheck className="h-3 w-3 text-blue-400" />
              ) : isDelivered ? (
                // Double check - Grey (Delivered but not read)
                <CheckCheck className="h-3 w-3 text-slate-400" />
              ) : (
                // Single check - Grey (Sent but not delivered)
                <Check className="h-3 w-3 text-slate-400" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
