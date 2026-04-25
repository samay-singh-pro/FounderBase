import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, PenSquare } from 'lucide-react'
import { ConversationItem } from './ConversationItem'

interface Conversation {
  id: string
  username: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  isOnline: boolean
  status?: 'pending' | 'accepted' | 'declined'
  isMuted?: boolean
}

interface ConversationListProps {
  conversations: Conversation[]
  requests: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  requestsCount?: number
}

export function ConversationList({ 
  conversations, 
  requests,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  requestsCount = 0
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages')

  const currentList = activeTab === 'messages' ? conversations : requests
  const filteredConversations = currentList.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Messages
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onNewChat}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0"
              title="New message"
            >
              <PenSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Requests
            {requestsCount > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                {requestsCount}
              </span>
            )}
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              {...conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => onSelectConversation(conversation.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
