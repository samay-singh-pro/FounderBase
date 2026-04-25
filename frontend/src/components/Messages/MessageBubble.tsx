import { useState } from 'react'
import { formatDate } from '@/utils/date'
import { Check, CheckCheck, MoreVertical, Pin, Trash2, Smile } from 'lucide-react'

interface Reaction {
  emoji: string
  count: number
}

interface MessageBubbleProps {
  id: string
  content: string
  timestamp: string
  isSent: boolean
  isDelivered?: boolean
  isRead?: boolean
  isPinned?: boolean
  isDeleted?: boolean
  reactions?: Reaction[]
  onDelete?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function MessageBubble({ 
  id,
  content, 
  timestamp, 
  isSent, 
  isDelivered = false, 
  isRead = false,
  isPinned = false,
  isDeleted = false,
  reactions = [],
  onDelete,
  onPin,
  onReact
}: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div className="flex flex-col max-w-[70%] lg:max-w-[60%]">
        <div className="relative flex items-start gap-2">
          {/* Action buttons on left for received, right for sent */}
          {!isDeleted && (
            <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSent ? 'order-2' : 'order-1'}`}>
              {/* Emoji Reaction Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowReactionPicker(!showReactionPicker)
                    setShowMenu(false)
                  }}
                  className="h-7 w-7 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                  title="React"
                >
                  <Smile className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </button>
                
                {/* Reaction Picker Popover */}
                {showReactionPicker && (
                  <div 
                    className={`absolute top-full mt-1 ${isSent ? 'right-0' : 'left-0'} bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 flex gap-1 z-20 animate-in fade-in zoom-in-95 duration-200`}
                    onMouseLeave={() => setShowReactionPicker(false)}
                  >
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReact?.(id, emoji)
                          setShowReactionPicker(false)
                        }}
                        className="text-xl hover:scale-125 active:scale-110 transition-transform p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* More Options Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMenu(!showMenu)
                    setShowReactionPicker(false)
                  }}
                  className="h-7 w-7 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                  title="More"
                >
                  <MoreVertical className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div 
                    className={`absolute top-full mt-1 ${isSent ? 'right-0' : 'left-0'} min-w-[150px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-20 animate-in fade-in zoom-in-95 duration-200`}
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <button
                      onClick={() => {
                        onPin?.(id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    {isSent && (
                      <button
                        onClick={() => {
                          onDelete?.(id)
                          setShowMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className={`flex flex-col ${isSent ? 'order-1' : 'order-2'}`}>
            <div
              className={`rounded-2xl px-3 py-2 relative ${
                isDeleted 
                  ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 italic'
                  : isSent
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            >
              {/* Pin Icon - Top right corner */}
              {isPinned && (
                <Pin className={`absolute top-2 ${isSent ? 'right-2' : 'right-2.5'} h-3.5 w-3.5 ${
                  isSent ? 'text-white/80' : 'text-blue-500 dark:text-blue-400'
                } fill-current`} />
              )}
              <p className={`text-[14.5px] leading-[1.4] break-words ${isPinned ? 'pr-6' : ''}`}>
                {content}
              </p>
            </div>

            {/* Reactions - Below message */}
            {reactions.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                {reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => onReact?.(id, reaction.emoji)}
                    className="flex items-center gap-0.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <span className="text-xs leading-none">{reaction.emoji}</span>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 leading-none">{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Timestamp and Status */}
            <div className={`flex items-center gap-1 mt-0.5 ${isSent ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {formatDate(timestamp)}
              </span>
              {isSent && !isDeleted && (
                <>
                  {isRead ? (
                    <CheckCheck className="h-3 w-3 text-blue-400" />
                  ) : isDelivered ? (
                    <CheckCheck className="h-3 w-3 text-slate-400" />
                  ) : (
                    <Check className="h-3 w-3 text-slate-400" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
