import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { followsService } from '@/services/follows.service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { Users, UserPlus, UserMinus, User, Compass } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  username: string
  email?: string
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
      useToastStore.getState().success('Unfollowed successfully')
    } catch {
      useToastStore.getState().error('Failed to unfollow')
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      await followsService.followUser(userId)
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Network Header Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Your Network
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Manage connections and discover new people
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleTabChange('followers')}>
                <Users className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {followers.length}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Followers</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleTabChange('following')}>
                <UserPlus className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {following.length}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Following</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleTabChange('suggestions')}>
                <Compass className="h-6 w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {suggestions.length}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Suggestions</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                            onClick={() => handleFollow(follower.id)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          >
                            <UserPlus className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Follow Back</span>
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
