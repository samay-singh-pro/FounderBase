import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getAvatarColor, getUsernameInitials } from '@/utils/avatar'
import { 
  User, 
  Bell, 
  BellOff, 
  Flag, 
  Ban, 
  FileText,
  Link as LinkIcon,
  Pin,
  Calendar,
  Users
} from 'lucide-react'
import api from '@/lib/api'

interface ChatInfoProps {
  username: string
  userId: string
  isOnline: boolean
  lastSeen?: string
}

interface UserProfile {
  id: string
  username: string
  full_name?: string
  bio?: string
  location?: string
  website?: string
  created_at?: string
}

interface MutualConnection {
  id: string
  username: string
}

export function ChatInfo({ username, userId, isOnline, lastSeen }: ChatInfoProps) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const avatarColor = getAvatarColor(username)

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

  const toggleMute = () => {
    setIsMuted(!isMuted)
    // TODO: Implement actual mute API call
  }

  return (
    <div className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
      <div className="p-6">
        {/* User Profile Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarColor.light} ${avatarColor.dark} flex items-center justify-center ${avatarColor.text} font-bold text-2xl`}>
              {getUsernameInitials(username)}
            </div>
            {isOnline && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            )}
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

        {/* Stats Section */}
        {profile && (
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

        {/* Shared Media Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Shared Media
              </h4>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Coming Soon</span>
          </div>
          <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
            <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No media shared yet
            </p>
          </div>
        </div>

        {/* Shared Links Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Shared Links
              </h4>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Coming Soon</span>
          </div>
          <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
            <LinkIcon className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No links shared yet
            </p>
          </div>
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
          </div>
          <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
            <Pin className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No pinned messages
            </p>
          </div>
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
              onClick={toggleMute}
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
            >
              <Ban className="h-4 w-4 mr-2" />
              Block User
            </Button>
          </div>
        </div>
      </div>
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
