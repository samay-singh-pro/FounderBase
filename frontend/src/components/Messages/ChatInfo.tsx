import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { getAvatarColor, getUsernameInitials } from '@/utils/avatar'
import { extractUrls, hostnameOf } from '@/utils/links'
import {
  User,
  Bell,
  BellOff,
  Flag,
  Ban,
  FileText,
  ExternalLink,
  Link as LinkIcon,
  Pin,
  Play,
  Calendar,
  Users,
  Camera,
  Loader2,
  Check,
  X as XIcon,
  Plus,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import api from '@/lib/api'
import { resolveMediaUrl, mediaService, classifyFile, type Media } from '@/services/media.service'
import type { GroupMember } from '@/lib/api'
import { useToastStore } from '@/store/toastStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface SharedMessage {
  id: string
  content: string
  timestamp: string
  media?: Media | null
}

interface ChatInfoProps {
  username: string
  userId: string
  isOnline: boolean
  lastSeen?: string
  pinnedMessages?: Array<{
    id: string
    content: string
    timestamp: string
  }>
  messages?: SharedMessage[]
  onScrollToMessage?: (messageId: string) => void
  isMuted?: boolean
  onMuteConversation?: () => void
  isBlocked?: boolean
  isBlockedByMe?: boolean
  isBlockedByThem?: boolean
  onBlockUser?: () => void

  // Group-mode (when isGroup is true these are required for full functionality).
  isGroup?: boolean
  groupName?: string | null
  groupAvatarUrl?: string | null
  members?: GroupMember[] | null
  currentUserId?: string
  followers?: Array<{ id: string; username: string; avatarUrl?: string | null }>
  onUpdateGroup?: (params: { name?: string; avatar_url?: string | null }) => Promise<void> | void
  onAddMembers?: (memberIds: string[]) => Promise<void> | void
  onRemoveMember?: (userId: string) => Promise<void> | void
  onLeaveGroup?: () => Promise<void> | void
  onDeleteGroup?: () => void
  // When provided, renders a close button (used when shown as a slide-over drawer).
  onClose?: () => void
}

interface UserProfile {
  id: string
  username: string
  full_name?: string
  bio?: string
  location?: string
  website?: string
  avatar_url?: string | null
  created_at?: string
}

interface MutualConnection {
  id: string
  username: string
}

export function ChatInfo({
  username,
  userId,
  isOnline,
  lastSeen,
  pinnedMessages = [],
  messages = [],
  onScrollToMessage,
  isMuted = false,
  onMuteConversation,
  isBlocked = false,
  isBlockedByMe = false,
  isBlockedByThem: _isBlockedByThem = false,
  onBlockUser,
  isGroup = false,
  groupName = null,
  groupAvatarUrl = null,
  members = null,
  currentUserId,
  followers = [],
  onUpdateGroup,
  onAddMembers,
  onRemoveMember,
  onLeaveGroup,
  onDeleteGroup,
  onClose,
}: ChatInfoProps) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([])

  // Newest first; media-bearing messages → grid, link-bearing → list.
  const sharedMedia = useMemo(() => {
    const items: Array<{ id: string; media: Media; timestamp: string }> = []
    for (const m of messages) {
      if (m.media) items.push({ id: m.id, media: m.media, timestamp: m.timestamp })
    }
    return items.reverse()
  }, [messages])

  const sharedLinks = useMemo(() => {
    const seen = new Set<string>()
    const items: Array<{ id: string; href: string; value: string; timestamp: string }> = []
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (!m.content) continue
      for (const url of extractUrls(m.content)) {
        if (seen.has(url.href)) continue
        seen.add(url.href)
        items.push({ id: `${m.id}-${url.href}`, href: url.href, value: url.value, timestamp: m.timestamp })
      }
    }
    return items
  }, [messages])

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  const loadUserProfile = async () => {
    try {
      const response = await api.get(`/api/v1/auth/users/${userId}`)
      setProfile(response.data)
      
      // TODO: Fetch mutual connections from API
      setMutualConnections([])
    } catch (error) {
      console.error('Failed to load profile:', error)
      // Fallback to basic info on error
      setProfile({
        id: userId,
        username,
        created_at: new Date().toISOString(),
      })
    }
  }

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  // ----------------- Group-mode panel -----------------
  if (isGroup) {
    return (
      <GroupChatInfo
        groupName={groupName}
        groupAvatarUrl={groupAvatarUrl}
        members={members}
        currentUserId={currentUserId}
        followers={followers}
        sharedMedia={sharedMedia}
        sharedLinks={sharedLinks}
        pinnedMessages={pinnedMessages}
        onScrollToMessage={onScrollToMessage}
        isMuted={isMuted}
        onMuteConversation={onMuteConversation}
        onUpdateGroup={onUpdateGroup}
        onAddMembers={onAddMembers}
        onRemoveMember={onRemoveMember}
        onLeaveGroup={onLeaveGroup}
        onDeleteGroup={onDeleteGroup}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
      <div className="p-6">
        {/* User Profile Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <Avatar
              username={username}
              avatarUrl={profile?.avatar_url}
              size={80}
              online={isOnline}
            />
          </div>
          
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {profile?.full_name || username}
          </h3>
          
          {profile?.full_name && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              @{username}
            </p>
          )}
          
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {isOnline ? '🟢 Active now' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
          </p>

          {/* Blocked Status Indicator - Only show if YOU blocked them */}
          {isBlockedByMe && (
            <div className="mb-3 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                <Ban className="h-3 w-3" />
                Blocked
              </p>
            </div>
          )}

          {profile?.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {profile.bio}
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full border-slate-200 dark:border-slate-700"
            onClick={() => navigate(`/user/${username}`)}
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </div>

        {/* Stats Section - Only show if at least one field has content */}
        {profile && (profile.location || profile.website || profile.created_at) && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
            {profile.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <a 
                href={profile.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>{profile.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {profile.created_at && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatJoinDate(profile.created_at)}</span>
              </div>
            )}
          </div>
        )}

        {/* Mutual Connections */}
        {mutualConnections.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Mutual Connections
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({mutualConnections.length})
              </span>
            </div>
            <div className="space-y-2">
              {mutualConnections.map((connection) => {
                const connectionColor = getAvatarColor(connection.username)
                return (
                  <div
                    key={connection.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/user/${connection.username}`)}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${connectionColor.light} ${connectionColor.dark} flex items-center justify-center ${connectionColor.text} font-semibold text-xs`}>
                      {getUsernameInitials(connection.username)}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {connection.username}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Shared Media */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Shared Media
              </h4>
            </div>
            {sharedMedia.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{sharedMedia.length}</span>
            )}
          </div>
          {sharedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {sharedMedia.slice(0, 12).map((item) => {
                const src = resolveMediaUrl(item.media.thumbnail_url || item.media.url)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onScrollToMessage?.(item.id)}
                    className="relative aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-blue-500 transition"
                    title="Jump to message"
                  >
                    {item.media.media_type === 'video' ? (
                      <>
                        <video src={resolveMediaUrl(item.media.url)} className="w-full h-full object-cover" preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No media shared yet</p>
            </div>
          )}
        </div>

        {/* Shared Links */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Shared Links
              </h4>
            </div>
            {sharedLinks.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{sharedLinks.length}</span>
            )}
          </div>
          {sharedLinks.length > 0 ? (
            <div className="space-y-1.5">
              {sharedLinks.slice(0, 20).map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition group"
                  title={link.href}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-200 truncate">
                    <span className="font-medium text-blue-600 dark:text-blue-400">{hostnameOf(link.href)}</span>
                    <span className="ml-1 text-slate-500 dark:text-slate-400">
                      {link.value.replace(/^https?:\/\//, '').replace(/^www\./, '').slice(hostnameOf(link.href).length)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <LinkIcon className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No links shared yet</p>
            </div>
          )}
        </div>

        {/* Pinned Messages Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pinned Messages
              </h4>
            </div>
            {pinnedMessages.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {pinnedMessages.length}
              </span>
            )}
          </div>
          {pinnedMessages.length > 0 ? (
            <div className="space-y-2">
              {pinnedMessages.map((msg) => (
                <div 
                  key={msg.id}
                  onClick={() => onScrollToMessage?.(msg.id)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                    {msg.content}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(msg.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <Pin className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No pinned messages
              </p>
            </div>
          )}
        </div>

        {/* Privacy & Support Section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Privacy & Support
          </h4>
          
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onMuteConversation}
              disabled={!onMuteConversation}
            >
              {isMuted ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Unmute Conversation
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Mute Conversation
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Flag className="h-4 w-4 mr-2" />
              Report User
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={onBlockUser}
              disabled={!onBlockUser}
            >
              <Ban className="h-4 w-4 mr-2" />
              {isBlockedByMe ? 'Unblock User' : 'Block User'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Group-chat info panel
// ---------------------------------------------------------------------------

interface GroupChatInfoProps {
  groupName: string | null
  groupAvatarUrl: string | null
  members: GroupMember[] | null
  currentUserId?: string
  followers: Array<{ id: string; username: string; avatarUrl?: string | null }>
  sharedMedia: Array<{ id: string; media: Media; timestamp: string }>
  sharedLinks: Array<{ id: string; href: string; value: string; timestamp: string }>
  pinnedMessages: Array<{ id: string; content: string; timestamp: string }>
  onScrollToMessage?: (messageId: string) => void
  isMuted?: boolean
  onMuteConversation?: () => void
  onUpdateGroup?: (params: { name?: string; avatar_url?: string | null }) => Promise<void> | void
  onAddMembers?: (memberIds: string[]) => Promise<void> | void
  onRemoveMember?: (userId: string) => Promise<void> | void
  onLeaveGroup?: () => Promise<void> | void
  onDeleteGroup?: () => void
  onClose?: () => void
}

function GroupChatInfo({
  groupName,
  groupAvatarUrl,
  members,
  currentUserId,
  followers,
  sharedMedia,
  sharedLinks,
  pinnedMessages,
  onScrollToMessage,
  isMuted = false,
  onMuteConversation,
  onUpdateGroup,
  onAddMembers,
  onRemoveMember,
  onLeaveGroup,
  onDeleteGroup,
  onClose,
}: GroupChatInfoProps) {
  const memberList = members || []
  const isAdmin = !!currentUserId && memberList.some(
    (m) => m.user_id === currentUserId && m.role === 'admin',
  )

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(groupName || '')
  const [isSavingName, setIsSavingName] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [addPickerSearch, setAddPickerSearch] = useState('')
  const [pendingAddIds, setPendingAddIds] = useState<Set<string>>(new Set())
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNameDraft(groupName || '')
  }, [groupName])

  const handleSaveName = async () => {
    const next = nameDraft.trim()
    if (!next || next === (groupName || '')) {
      setIsEditingName(false)
      setNameDraft(groupName || '')
      return
    }
    if (!onUpdateGroup) return
    setIsSavingName(true)
    try {
      await onUpdateGroup({ name: next })
      setIsEditingName(false)
    } catch {
      useToastStore.getState().error('Failed to rename group')
    } finally {
      setIsSavingName(false)
    }
  }

  const handleAvatarFile = async (file: File | null | undefined) => {
    if (!file || !onUpdateGroup) return
    const check = classifyFile(file)
    if (check.error || check.kind === 'video') {
      useToastStore.getState().error(check.error || 'Group avatar must be an image')
      return
    }
    setIsUploadingAvatar(true)
    try {
      const uploaded = await mediaService.upload(file)
      await onUpdateGroup({ avatar_url: uploaded.url })
    } catch (err: any) {
      useToastStore.getState().error(err?.response?.data?.detail || 'Avatar upload failed')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const memberIdSet = useMemo(() => new Set(memberList.map((m) => m.user_id)), [memberList])
  const addCandidates = useMemo(
    () =>
      followers
        .filter((f) => !memberIdSet.has(f.id))
        .filter((f) => f.username.toLowerCase().includes(addPickerSearch.toLowerCase())),
    [followers, memberIdSet, addPickerSearch],
  )

  const togglePendingAdd = (id: string) => {
    setPendingAddIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmitAdd = async () => {
    if (!onAddMembers || pendingAddIds.size === 0) return
    setIsAddingMembers(true)
    try {
      await onAddMembers(Array.from(pendingAddIds))
      setPendingAddIds(new Set())
      setShowAddPicker(false)
      setAddPickerSearch('')
    } catch {
      useToastStore.getState().error('Failed to add members')
    } finally {
      setIsAddingMembers(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !onRemoveMember) return
    setIsRemovingMember(true)
    try {
      await onRemoveMember(memberToRemove.user_id)
      setMemberToRemove(null)
    } catch {
      useToastStore.getState().error('Failed to remove member')
    } finally {
      setIsRemovingMember(false)
    }
  }

  return (
    <div className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
      <div className="p-6">
        {onClose && (
          <div className="flex items-center justify-between mb-4 -mt-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Group info</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* Group header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <Avatar username={groupName || 'Group'} avatarUrl={groupAvatarUrl} size={80} />
            {isAdmin && onUpdateGroup && (
              <label
                className={`absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-blue-600 hover:bg-blue-700 text-white p-1.5 shadow ${
                  isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''
                }`}
                title="Change group photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          {isEditingName ? (
            <div className="w-full flex gap-2 mb-1">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={120}
                disabled={isSavingName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') {
                    setIsEditingName(false)
                    setNameDraft(groupName || '')
                  }
                }}
                autoFocus
                className="text-center"
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={isSavingName}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0"
                title="Save"
              >
                {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isAdmin || !onUpdateGroup}
              onClick={() => setIsEditingName(true)}
              className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 disabled:cursor-default"
              title={isAdmin ? 'Click to rename' : undefined}
            >
              {groupName || 'Group chat'}
            </button>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {memberList.length} member{memberList.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Members */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Members</h4>
            </div>
            {isAdmin && onAddMembers && (
              <button
                type="button"
                onClick={() => setShowAddPicker((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                {showAddPicker ? 'Cancel' : 'Add'}
              </button>
            )}
          </div>

          {showAddPicker && (
            <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800/50">
              <Input
                value={addPickerSearch}
                onChange={(e) => setAddPickerSearch(e.target.value)}
                placeholder="Search followers..."
                className="bg-white dark:bg-slate-900 text-sm h-8 rounded-full mb-2"
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {addCandidates.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-2 text-center">
                    No followers to add
                  </p>
                ) : (
                  addCandidates.map((u) => {
                    const checked = pendingAddIds.has(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => togglePendingAdd(u.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition ${
                          checked
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Avatar username={u.username} avatarUrl={u.avatarUrl} size={28} />
                        <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 truncate">
                          {u.username}
                        </span>
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            checked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {checked && <Check className="h-2.5 w-2.5" />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmitAdd}
                  disabled={isAddingMembers || pendingAddIds.size === 0}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isAddingMembers ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    `Add ${pendingAddIds.size || ''}`.trim()
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {memberList.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <Avatar username={m.username} avatarUrl={m.avatar_url} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {m.username}
                    </span>
                    {m.role === 'admin' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Admin
                      </span>
                    )}
                    {m.user_id === currentUserId && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">(you)</span>
                    )}
                  </div>
                </div>
                {isAdmin && m.user_id !== currentUserId && onRemoveMember && (
                  <button
                    type="button"
                    onClick={() => setMemberToRemove(m)}
                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    title={`Remove ${m.username}`}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shared Media */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Shared Media</h4>
            </div>
            {sharedMedia.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{sharedMedia.length}</span>
            )}
          </div>
          {sharedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {sharedMedia.slice(0, 12).map((item) => {
                const src = resolveMediaUrl(item.media.thumbnail_url || item.media.url)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onScrollToMessage?.(item.id)}
                    className="relative aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-blue-500 transition"
                  >
                    {item.media.media_type === 'video' ? (
                      <>
                        <video src={resolveMediaUrl(item.media.url)} className="w-full h-full object-cover" preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <FileText className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No media shared yet</p>
            </div>
          )}
        </div>

        {/* Shared Links */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Shared Links</h4>
            </div>
            {sharedLinks.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{sharedLinks.length}</span>
            )}
          </div>
          {sharedLinks.length > 0 ? (
            <div className="space-y-1.5">
              {sharedLinks.slice(0, 20).map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition group"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-200 truncate">
                    <span className="font-medium text-blue-600 dark:text-blue-400">{hostnameOf(link.href)}</span>
                    <span className="ml-1 text-slate-500 dark:text-slate-400">
                      {link.value.replace(/^https?:\/\//, '').replace(/^www\./, '').slice(hostnameOf(link.href).length)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <LinkIcon className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No links shared yet</p>
            </div>
          )}
        </div>

        {/* Pinned */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pinned Messages</h4>
            </div>
            {pinnedMessages.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{pinnedMessages.length}</span>
            )}
          </div>
          {pinnedMessages.length > 0 ? (
            <div className="space-y-2">
              {pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => onScrollToMessage?.(msg.id)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">{msg.content}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(msg.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <Pin className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No pinned messages</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-2">
          {onMuteConversation && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onMuteConversation}
            >
              {isMuted ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Unmute group
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Mute group
                </>
              )}
            </Button>
          )}
          {onLeaveGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={onLeaveGroup}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave group
            </Button>
          )}
          {isAdmin && onDeleteGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={onDeleteGroup}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete group
            </Button>
          )}
        </div>
      </div>

      <Dialog open={!!memberToRemove} onOpenChange={(open) => { if (!open) setMemberToRemove(null) }}>
        <DialogContent>
          <DialogHeader onClose={() => setMemberToRemove(null)}>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Remove <strong>{memberToRemove?.username}</strong> from this group? They
              will lose access to the conversation. You can add them back later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={isRemovingMember}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={isRemovingMember}>
              {isRemovingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatLastSeen(lastSeen?: string): string {
  if (!lastSeen) return 'Offline'
  
  const now = new Date()
  const lastSeenDate = new Date(lastSeen)
  const diffMs = now.getTime() - lastSeenDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return 'a while ago'
}
