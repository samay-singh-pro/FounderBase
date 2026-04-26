import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { statsService, type CategoryStat, type ActiveUser } from '@/services/stats.service'
import { opportunitiesService, type Opportunity } from '@/services/opportunities.service'
import { TrendingUp, Crown, Sparkles, Clock, MessageSquare, Heart, ExternalLink } from 'lucide-react'
import { Spinner } from './ui/spinner'

export default function RightSidebar() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryStat[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [recentPosts, setRecentPosts] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [categoriesData, usersData, postsData] = await Promise.all([
        statsService.getTrendingCategories(6),
        statsService.getActiveUsers(5),
        opportunitiesService.getAll({ skip: 0, limit: 3, sort_by: 'created_at', sort_order: 'desc' })
      ])
      setCategories(categoriesData.categories)
      setActiveUsers(usersData.users)
      setRecentPosts(postsData.opportunities)
    } catch (error) {
      console.error('Failed to load sidebar data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryRowClass = () =>
    'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60'

  const getUserBadgeClass = () =>
    'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'

  if (isLoading) {
    return (
      <div className="sticky top-6">
        <Card>
          <CardContent className="p-4 flex justify-center">
            <Spinner />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="sticky top-6 space-y-4">
      {/* Trending Categories */}
      {categories.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Trending Categories
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.category}
                className={`p-3 rounded-lg border transition-all lift-on-hover cursor-pointer ${getCategoryRowClass()}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-sm">
                    {cat.category}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 tabular-nums">
                    {cat.count}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Top Contributors
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeUsers.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/user/${user.username}`)}
              >
                <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${getUserBadgeClass()}`}>
                  {user.username.charAt(0).toUpperCase()}
                  {index === 0 && (
                    <div className="absolute -top-1 -right-1">
                      <Crown className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user.posts_count} {user.posts_count === 1 ? 'post' : 'posts'}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentPosts.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Recent Activity
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-xs h-7 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                onClick={() => navigate(`/opportunity/${post.id}`)}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-semibold text-xs flex-shrink-0">
                    {post.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                      {post.username}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-2">
                  {post.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {post.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {post.comments_count || 0}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 capitalize">
                    {post.type}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Platform Info */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Sparkles className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
                Join the Community
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Share your ideas, solve problems, and connect with innovators worldwide.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate('/create')}
                  className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Get Started
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://github.com', '_blank')}
                  className="text-xs h-8"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
