import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { opportunitiesService, type Opportunity } from '@/services/opportunities.service'
import { bookmarksService } from '@/services/bookmarks.service'
import { authService } from '@/services/auth.service'
import { draftsService, type Draft } from '@/services/drafts.service'
import { likesService } from '@/services/likes.service'
import OpportunityCard from './OpportunityCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { User, FileText, Bookmark, Heart, File, Edit, Users } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const activeTab = searchParams.get('tab') || 'posts'

  const [myPosts, setMyPosts] = useState<Opportunity[]>([])
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Opportunity[]>([])
  const [likedPosts, setLikedPosts] = useState<Opportunity[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [stats, setStats] = useState({
    posts_count: 0,
    followers_count: 0,
    following_count: 0,
    total_likes: 0,
    bookmarks_count: 0,
  })

  useEffect(() => {
    loadData()
    loadStats()
  }, [activeTab])

  const loadStats = async () => {
    try {
      const stats = await authService.getMyStats()
      setStats(stats)
    } catch (error) {
      useToastStore.getState().error('Failed to load stats')
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'posts') {
        await loadMyPosts()
      } else if (activeTab === 'bookmarks') {
        await loadBookmarks()
      } else if (activeTab === 'likes') {
        await loadLikedPosts()
      } else if (activeTab === 'drafts') {
        await loadDrafts()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadMyPosts = async () => {
    try {
      const response = await opportunitiesService.getMyOpportunities({ 
        limit: 100,
        sort_by: 'created_at',
        sort_order: 'desc'
      })
      setMyPosts(response.opportunities)
    } catch (error) {
      useToastStore.getState().error('Failed to load your posts')
    }
  }

  const loadBookmarks = async () => {
    try {
      const response = await bookmarksService.getMyBookmarks(0, 100)
      setBookmarkedPosts(response.opportunities || [])
    } catch (error) {
      useToastStore.getState().error('Failed to load bookmarks')
    }
  }

  const loadLikedPosts = async () => {
    try {
      const response = await likesService.getMyLikedOpportunities(0, 100)
      setLikedPosts(response.opportunities || [])
    } catch (error) {
      useToastStore.getState().error('Failed to load liked posts')
    }
  }

  const loadDrafts = async () => {
    try {
      const data = await draftsService.getAll()
      setDrafts(data)
    } catch (error) {
      useToastStore.getState().error('Failed to load drafts')
    }
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value })
  }

  const handleDeletePost = (id: string) => {
    setMyPosts((prev) => prev.filter((post) => post.id !== id))
    loadStats()
  }

  const handleEditDraft = (draft: Draft) => {
    navigate(`/create?draftId=${draft.id}`)
  }

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await draftsService.delete(draftId)
      setDrafts((prev) => prev.filter((d) => d.id !== draftId))
      useToastStore.getState().success('Draft deleted successfully')
    } catch {
      useToastStore.getState().error('Failed to delete draft')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-bold text-3xl">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {user?.username}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                className="rounded-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.posts_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Posts</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Users className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.followers_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Followers</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <User className="h-6 w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.following_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Following</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Heart className="h-6 w-6 mx-auto mb-2 text-red-600 dark:text-red-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.total_likes}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Likes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="posts" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">My Posts</span>
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-2">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Bookmarks</span>
            </TabsTrigger>
            <TabsTrigger value="likes" className="gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Liked</span>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="gap-2">
              <File className="h-4 w-4" />
              <span className="hidden sm:inline">Drafts</span>
            </TabsTrigger>
          </TabsList>

          {/* My Posts Tab */}
          <TabsContent value="posts">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : myPosts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    You haven't created any posts yet
                  </p>
                  <Button onClick={() => navigate('/create')}>
                    Create Your First Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myPosts.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onDelete={handleDeletePost}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bookmarks Tab */}
          <TabsContent value="bookmarks">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bookmark className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    No bookmarks yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Bookmark posts to save them for later
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookmarkedPosts.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Liked Posts Tab */}
          <TabsContent value="likes">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : likedPosts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Heart className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    No liked posts yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Posts you like will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {likedPosts.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Drafts Tab */}
          <TabsContent value="drafts">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : drafts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <File className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    No drafts saved
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Your draft posts will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <Card key={draft.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-2">
                            {draft.title || 'Untitled Draft'}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-3">
                            {draft.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {draft.type}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                              {draft.category}
                            </span>
                            <span>
                              Saved {new Date(draft.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDraft(draft)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
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
