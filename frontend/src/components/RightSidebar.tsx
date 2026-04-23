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

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
      'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
      'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
      'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
      'bg-pink-100 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30',
      'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30',
    ]
    return colors[index % colors.length]
  }

  const getUserBadgeColor = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-600 dark:to-yellow-500 text-yellow-700 dark:text-white'
    if (index === 1) return 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-500 dark:to-slate-600 text-slate-700 dark:text-white'
    if (index === 2) return 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-600 dark:to-orange-500 text-orange-700 dark:text-white'
    return 'bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-600 dark:to-cyan-500 text-blue-700 dark:text-white'
  }

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
            {categories.map((cat, index) => (
              <div
                key={cat.category}
                className={`p-3 rounded-lg border transition-all hover:scale-105 cursor-pointer ${getCategoryColor(index)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-sm">
                    {cat.category}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/30 dark:bg-black/20">
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
                <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getUserBadgeColor(index)}`}>
                  {user.username.charAt(0).toUpperCase()}
                  {index < 3 && (
                    <div className="absolute -top-1 -right-1">
                      <Crown className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-bold text-xs flex-shrink-0">
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
      <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
                Join the Community
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Share your ideas, solve problems, and connect with innovators worldwide.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate('/create')}
                  className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700"
                >
                  Get Started
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://github.com', '_blank')}
                  className="text-xs h-8 border-blue-300 dark:border-blue-500/30"
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
