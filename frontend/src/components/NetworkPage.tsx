import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { followsService } from '@/services/follows.service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { Users, UserPlus, UserMinus, User, Compass } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  username: string
  email?: string
  is_following?: boolean
}

export default function NetworkPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const activeTab = searchParams.get('tab') || 'followers'

  const [followers, setFollowers] = useState<UserProfile[]>([])
  const [following, setFollowing] = useState<UserProfile[]>([])
  const [suggestions, setSuggestions] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [user?.id])

  const loadAllData = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // Load all data to show correct counts in tabs
      await Promise.all([loadFollowers(), loadFollowing(), loadSuggestions()])
    } finally {
      setIsLoading(false)
    }
  }

  const loadFollowers = async () => {
    try {
      const response = await followsService.getFollowers(user?.id || '', 1, 100)
      setFollowers(response.followers || [])
    } catch (error) {
      useToastStore.getState().error('Failed to load followers')
    }
  }

  const loadFollowing = async () => {
    try {
      const response = await followsService.getFollowing(user?.id || '', 1, 100)
      setFollowing(response.following || [])
    } catch (error) {
      useToastStore.getState().error('Failed to load following')
    }
  }

  const loadSuggestions = async () => {
    try {
      const response = await followsService.getSuggestedUsers(1, 100)
      setSuggestions(response.users || [])
    } catch (error) {
      useToastStore.getState().error('Failed to load suggestions')
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      await followsService.unfollowUser(userId)
      // Remove from following list immediately for better UX
      setFollowing((prev) => prev.filter((u) => u.id !== userId))
      // Update followers list to show "Follow Back" again
      setFollowers((prev) => prev.map((f) => 
        f.id === userId ? { ...f, is_following: false } : f
      ))
      useToastStore.getState().success('Unfollowed successfully')
    } catch {
      useToastStore.getState().error('Failed to unfollow')
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      await followsService.followUser(userId)
      // Update followers list to show "Following"
      setFollowers((prev) => prev.map((f) => 
        f.id === userId ? { ...f, is_following: true } : f
      ))
      useToastStore.getState().success('Followed successfully')
      // Reload data to update counts and lists
      await Promise.all([loadFollowing(), loadSuggestions()])
    } catch {
      useToastStore.getState().error('Failed to follow')
    }
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-page-soft">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero — sophisticated dark surface */}
        <div className="hero-surface rounded-2xl mb-6 p-6 sm:p-7 shadow-sm">
          <div className="absolute inset-0 bg-grid-pattern opacity-50" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="hero-chip mb-3">
                <Users className="h-3 w-3 hero-accent-text" />
                <span>Your Network</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                People &amp; connections
              </h1>
              <p className="text-sm opacity-70 max-w-md mt-1">
                Manage connections and discover new people in your space.
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-14 h-14 shrink-0 rounded-xl border border-white/10 bg-white/[0.04]">
              <Users className="h-6 w-6 hero-accent-text" />
            </div>
          </div>
        </div>

        {/* Stats grid — monochrome, single style */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => handleTabChange('followers')}
            className="text-left p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 lift-on-hover"
          >
            <Users className="h-4 w-4 mb-3 text-slate-500 dark:text-slate-400" />
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {followers.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Followers</div>
          </button>
          <button
            onClick={() => handleTabChange('following')}
            className="text-left p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 lift-on-hover"
          >
            <UserPlus className="h-4 w-4 mb-3 text-slate-500 dark:text-slate-400" />
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {following.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Following</div>
          </button>
          <button
            onClick={() => handleTabChange('suggestions')}
            className="text-left p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 lift-on-hover"
          >
            <Compass className="h-4 w-4 mb-3 text-slate-500 dark:text-slate-400" />
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {suggestions.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Suggestions</div>
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="followers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Followers</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">Suggestions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : followers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
                    No followers yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Share great content to attract followers
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {followers.map((follower) => (
                  <Card key={follower.id} className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-600 dark:to-emerald-500 flex items-center justify-center text-green-700 dark:text-white font-bold text-lg flex-shrink-0">
                            {follower.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {follower.username}
                            </h3>
                            {follower.email && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                {follower.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/user/${follower.username}`)}
                            className="hidden sm:flex"
                          >
                            <User className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Profile</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => follower.is_following ? handleUnfollow(follower.id) : handleFollow(follower.id)}
                            className={follower.is_following 
                              ? "text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" 
                              : "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            }
                          >
                            {follower.is_following ? (
                              <>
                                <UserMinus className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Follow Back</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : following.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserPlus className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
                    Not following anyone yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Discover and follow interesting people
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {following.map((user) => (
                  <Card key={user.id} className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-bold text-lg flex-shrink-0">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {user.username}
                            </h3>
                            {user.email && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/user/${user.username}`)}
                            className="hidden sm:flex"
                          >
                            <User className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Profile</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnfollow(user.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <UserMinus className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Unfollow</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : suggestions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Compass className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
                    No suggestions available
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    You're following everyone on the platform!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestedUser) => (
                  <Card key={suggestedUser.id} className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-600 dark:to-pink-500 flex items-center justify-center text-purple-700 dark:text-white font-bold text-lg flex-shrink-0">
                            {suggestedUser.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {suggestedUser.username}
                            </h3>
                            {suggestedUser.email && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                {suggestedUser.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/user/${suggestedUser.username}`)}
                            className="hidden sm:flex"
                          >
                            <User className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Profile</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleFollow(suggestedUser.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <UserPlus className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Follow</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
