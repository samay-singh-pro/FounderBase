import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { statsService, type PlatformOverview } from '@/services/stats.service'
import { followsService, type UserProfile } from '@/services/follows.service'
import { useAuthStore } from '@/store/authStore'
import { Users, FileText, Grid3x3, Lightbulb, AlertCircle, TrendingUp, UserPlus, Sparkles } from 'lucide-react'
import { Spinner } from './ui/spinner'

export default function LeftSidebar() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<PlatformOverview | null>(null)
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        statsService.getPlatformOverview(),
        user ? followsService.getSuggestedUsers(1, 3) : Promise.resolve({ users: [], total: 0, page: 1, limit: 3 })
      ])
      setStats(statsData)
      setSuggestedUsers(usersData.users || [])
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoading(false)
    }
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
      {/* Platform Overview */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Platform Stats
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Posts</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_opportunities || 0}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/10">
                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Users</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_users || 0}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/10">
                <Grid3x3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Categories</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_categories || 0}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* By Type */}
      {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              By Type
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.by_type.problem !== undefined && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Problems</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {stats.by_type.problem}
                </span>
              </div>
            )}

            {stats.by_type.idea !== undefined && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Ideas</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {stats.by_type.idea}
                </span>
              </div>
            )}

            {stats.by_type.improvement !== undefined && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Improvements</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {stats.by_type.improvement}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggested Users to Follow */}
      {user && suggestedUsers.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Suggested for you
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/network?tab=suggestions')}
                className="text-xs h-7 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                See all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedUsers.map((suggestedUser) => (
              <div
                key={suggestedUser.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/user/${suggestedUser.username}`)}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-600 dark:to-pink-500 flex items-center justify-center text-purple-700 dark:text-white font-bold text-sm flex-shrink-0">
                  {suggestedUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {suggestedUser.username}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {suggestedUser.email}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Quick Actions
            </h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={() => navigate('/create')}
            className="w-full justify-start bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            size="sm"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Share an Idea
          </Button>
          <Button
            onClick={() => navigate('/create')}
            variant="outline"
            className="w-full justify-start hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:border-red-500/30"
            size="sm"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Report a Problem
          </Button>
          <Button
            onClick={() => navigate('/network')}
            variant="outline"
            className="w-full justify-start hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-500/10 dark:hover:border-green-500/30"
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Explore Network
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
