import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { getAvatarColor, getUsernameInitials } from '@/utils/avatar'

interface Follower {
  id: string
  username: string
  isOnline: boolean
}

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (userId: string, username: string) => void
  followers: Follower[]
}

export function NewChatModal({ isOpen, onClose, onSelectUser, followers }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const filteredFollowers = followers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectUser = (userId: string, username: string) => {
    onSelectUser(userId, username)
    setSearchQuery('')
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            New Message
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search people you follow..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full"
              autoFocus
            />
          </div>
        </div>

        {/* Followers List */}
        <div className="flex-1 overflow-y-auto">
          {filteredFollowers.length > 0 ? (
            filteredFollowers.map((follower) => {
              const avatarColor = getAvatarColor(follower.username)
              return (
                <div
                  key={follower.id}
                  onClick={() => handleSelectUser(follower.id, follower.username)}
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:rounded-b-2xl"
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor.light} ${avatarColor.dark} flex items-center justify-center ${avatarColor.text} font-semibold text-sm`}>
                      {getUsernameInitials(follower.username)}
                    </div>
                    {follower.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {follower.username}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {follower.isOnline ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No followers found' : 'You don\'t follow anyone yet'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Start following users to message them
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
