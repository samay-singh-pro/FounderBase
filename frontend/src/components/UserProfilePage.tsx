import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { opportunitiesService, type Opportunity } from '@/services/opportunities.service'
import OpportunityCard from './OpportunityCard'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { User, FileText, Users, MapPin, Globe, Calendar, MessageSquare, UserPlus, UserMinus, ShieldX, Heart } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import api from '@/lib/api'

interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  bio?: string
  location?: string
  website?: string
  created_at?: string
}

interface UserStats {
  posts_count: number
  followers_count: number
  following_count: number
  total_likes: number
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userPosts, setUserPosts] = useState<Opportunity[]>([])
  const [stats, setStats] = useState<UserStats>({
    posts_count: 0,
    followers_count: 0,
    following_count: 0,
    total_likes: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isCheckingFollow, setIsCheckingFollow] = useState(true)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockInfo, setBlockInfo] = useState({ blocked_by_me: false, blocked_by_them: false })

  useEffect(() => {
    if (username) {
      loadUserData()
    }
  }, [username])

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      // Fetch all posts and filter by username to get user info
      const postsResponse = await opportunitiesService.getAll({ 
        limit: 100,
        sort_by: 'created_at',
        sort_order: 'desc'
      })
      
      // Find posts by this user
      const userPostsFiltered = postsResponse.opportunities.filter(
        (post: Opportunity) => post.username === username
      )
      
      if (userPostsFiltered.length === 0) {
        useToastStore.getState().error('User not found')
        navigate('/')
        return
      }

      setUserPosts(userPostsFiltered)
      
      // Get userId from first post
      const userId = userPostsFiltered[0].user_id
      
      // Check block status first
      if (currentUser?.id !== userId) {
        const blockStatusResponse = await api.get(`/api/v1/messages/users/${userId}/block-status`)
        if (blockStatusResponse.data.is_blocked) {
          setIsBlocked(true)
          setBlockInfo({
            blocked_by_me: blockStatusResponse.data.blocked_by_me,
            blocked_by_them: blockStatusResponse.data.blocked_by_them
          })
          setIsLoading(false)
          return // Don't load profile data if blocked
        }
      }
      
      // Fetch user profile
      const profileResponse = await api.get(`/api/v1/auth/users/${userId}`)
      setProfile(profileResponse.data)
      
      // Fetch user stats
      const statsResponse = await api.get(`/api/v1/auth/users/${userId}/stats`)
      setStats(statsResponse.data)
      
      // Check if following
      if (currentUser?.id !== userId) {
        const followStatusResponse = await api.get(`/api/v1/users/${userId}/follow-status`)
        setIsFollowing(followStatusResponse.data.is_following)
      }
      setIsCheckingFollow(false)
    } catch (error) {
      console.error('Failed to load user data:', error)
      useToastStore.getState().error('Failed to load user profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    
    try {
      if (isFollowing) {
        await api.delete(`/api/v1/users/${profile.id}/follow`)
        setIsFollowing(false)
        setStats(prev => ({ ...prev, followers_count: prev.followers_count - 1 }))
        useToastStore.getState().success(`Unfollowed ${profile.username}`)
      } else {
        await api.post(`/api/v1/users/${profile.id}/follow`)
        setIsFollowing(true)
        setStats(prev => ({ ...prev, followers_count: prev.followers_count + 1 }))
        useToastStore.getState().success(`Following ${profile.username}`)
      }
    } catch (error) {
      useToastStore.getState().error('Failed to update follow status')
    }
  }

  const handleMessage = () => {
    navigate(`/messages`)
  }

  const formatJoinDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const isOwnProfile = currentUser?.username === username

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <ShieldX className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {blockInfo.blocked_by_me ? 'User Blocked' : 'Profile Unavailable'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {blockInfo.blocked_by_me 
              ? `You have blocked @${username}. You cannot view their profile, posts, or interact with them.`
              : 'This profile is not available.'}
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go Home
          </Button>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">User not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-page-soft">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile Header with cover banner */}
        <Card className="mb-6 overflow-hidden">
          <div className="hero-surface relative h-36 sm:h-44">
            <div className="absolute inset-0 bg-grid-pattern opacity-40" />
          </div>
          <CardHeader className="relative pt-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-14">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white font-semibold text-4xl ring-4 ring-white dark:ring-slate-900 shadow-md">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="pb-1 sm:pb-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    @{profile.username}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 self-start sm:self-end">
                {!isOwnProfile && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMessage}
                      className="rounded-full"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleFollowToggle}
                      disabled={isCheckingFollow}
                      className={`rounded-full ${
                        isFollowing
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  </>
                )}
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/profile')}
                    className="rounded-full"
                  >
                    View My Profile
                  </Button>
                )}
              </div>
            </div>
            {profile.bio && (
              <p className="text-slate-700 dark:text-slate-300 text-sm mt-4 max-w-2xl">
                {profile.bio}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600 dark:text-slate-400">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                <Calendar className="h-3.5 w-3.5" />
                Joined {formatJoinDate(profile.created_at)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-left p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 lift-on-hover">
                <FileText className="h-4 w-4 mb-3 text-slate-500 dark:text-slate-400" />
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  {stats.posts_count}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Posts</div>
              </div>
              <button
                className="text-left p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 cursor-pointer lift-on-hover"
                onClick={() => navigate(`/network?user=${profile.username}&tab=followers`)}
              >
                <Users className="h-4 w-4 mb-3 text-slate-500 dark:text-slate-400" />
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  {stats.followers_count}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Followers</div>
              </button>
              <button
                className="text-left p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 cursor-pointer lift-on-hover"
                onClick={() => navigate(`/network?user=${profile.username}&tab=following`)}
              >
                <User className="h-4 w-4 mb-3 text-slate-500 dark:text-slate-400" />
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  {stats.following_count}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Following</div>
              </button>
              <div className="text-left p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 lift-on-hover">
                <Heart className="h-4 w-4 mb-3 text-slate-500 dark:text-slate-400" />
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  {stats.total_likes}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Likes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Posts */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Posts by {profile.full_name || profile.username}
          </h2>
        </div>

        {userPosts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                No posts yet
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {isOwnProfile ? "Start sharing your ideas!" : `${profile.username} hasn't posted anything yet`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {userPosts.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
