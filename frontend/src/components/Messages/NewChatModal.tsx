import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Search, X, Send, Loader2, Users, Check } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

interface Follower {
  id: string
  username: string
  avatarUrl?: string | null
  isOnline: boolean
}

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (userId: string, username: string, message?: string) => void
  onCreateGroup?: (params: { name: string; member_ids: string[] }) => void | Promise<void>
  followers: Follower[]
  preselectedUser?: { userId: string; username: string } | null
}

export function NewChatModal({ isOpen, onClose, onSelectUser, onCreateGroup, followers, preselectedUser }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [mode, setMode] = useState<'dm' | 'group'>('dm')
  const [groupName, setGroupName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  const filteredFollowers = followers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectUser = (userId: string, username: string) => {
    onSelectUser(userId, username)
    setSearchQuery('')
    onClose()
  }

  const handleSendRequest = async () => {
    if (!preselectedUser || !message.trim()) return

    setIsSending(true)
    try {
      await onSelectUser(preselectedUser.userId, preselectedUser.username, message.trim())
      setMessage('')
    } catch {
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
      e.preventDefault()
      handleSendRequest()
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreateGroup = async () => {
    if (!onCreateGroup) return
    if (!groupName.trim() || selectedIds.size === 0) return
    setIsCreating(true)
    try {
      await onCreateGroup({
        name: groupName.trim(),
        member_ids: Array.from(selectedIds),
      })
      setGroupName('')
      setSelectedIds(new Set())
      setMode('dm')
      onClose()
    } finally {
      setIsCreating(false)
    }
  }

  if (preselectedUser) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Send Message Request
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

          <div className="p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <Avatar
                username={preselectedUser.username}
                avatarUrl={null}
                size={64}
                className="mb-3"
              />
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {preselectedUser.username}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Introduce yourself to start chatting
              </p>
            </div>

            <div className="mb-4">
              <Textarea
                placeholder="Hi! I saw your post and would love to connect..."
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setMessage(e.target.value)
                  }
                }}
                onKeyDown={handleKeyDown}
                rows={3}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                disabled={isSending}
                autoFocus
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  They'll receive this as a message request
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {message.length}/500
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  onClose()
                  setMessage('')
                }}
                disabled={isSending}
                className="flex-1 rounded-full border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendRequest}
                disabled={isSending || !message.trim()}
                className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
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
            {mode === 'group' ? 'New Group' : 'New Message'}
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

        {/* Mode toggle */}
        {onCreateGroup && (
          <div className="px-4 pt-3">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('dm')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'dm'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setMode('group')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'group'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Group
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          {mode === 'group' && (
            <Input
              type="text"
              placeholder="Group name"
              value={groupName}
              maxLength={120}
              onChange={(e) => setGroupName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full"
            />
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder={mode === 'group' ? 'Search to add members...' : 'Search people you follow...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full"
              autoFocus={mode !== 'group'}
            />
          </div>
          {mode === 'group' && selectedIds.size > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedIds.size} selected
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredFollowers.length > 0 ? (
            filteredFollowers.map((follower) => {
              const isSelected = selectedIds.has(follower.id)
              return (
                <div
                  key={follower.id}
                  onClick={() =>
                    mode === 'group'
                      ? toggleSelected(follower.id)
                      : handleSelectUser(follower.id, follower.username)
                  }
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                    mode === 'group' && isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Avatar
                    username={follower.username}
                    avatarUrl={follower.avatarUrl}
                    size={48}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {follower.username}
                    </p>
                  </div>
                  {mode === 'group' && (
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  )}
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

        {mode === 'group' && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="rounded-full border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim() || selectedIds.size === 0}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create group
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
