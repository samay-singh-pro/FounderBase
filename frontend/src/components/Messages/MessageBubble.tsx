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
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className="flex flex-col max-w-[75%] lg:max-w-[65%]">
        <div
          className={`rounded-2xl px-5 py-3 shadow-sm ${
            isSent
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700'
          }`}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
        <div className={`flex items-center gap-1 mt-1.5 px-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {formatDate(timestamp)}
          </span>
          {isSent && (
            <span className="ml-1">
              {isRead ? (
                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
              ) : isDelivered ? (
                <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <Check className="h-3.5 w-3.5 text-slate-400" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
