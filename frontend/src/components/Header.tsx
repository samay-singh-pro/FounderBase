import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, themeConfig, type Theme } from '@/stores/themeStore'
import { LogOut, Moon, Sun, Plus, RefreshCw, ArrowLeft, MessageSquare, User, FileText, Bookmark, Users, Settings, ChevronDown, Palette, Check } from 'lucide-react'
import { DropdownMenu, DropdownMenuItem } from './ui/dropdown-menu'
import api from '@/lib/api'

interface HeaderProps {
  onRefresh?: () => void
  isRefreshing?: boolean
  showBackButton?: boolean
}

export default function Header({ onRefresh, isRefreshing = false, showBackButton = false }: HeaderProps) {
  const navigate = useNavigate()
  const { user, clearAuth, updateUser } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme)
    try {
      const response = await api.put('/api/v1/auth/me', { theme: newTheme })
      if (response.data) {
        updateUser(response.data)
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error)
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/auth')
  }

  const getThemeIcon = () => {
    if (theme === 'dark' || theme === 'forest') return <Moon className="h-4 w-4" />
    return <Sun className="h-4 w-4" />
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
      <div className="max-w-8xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <h1
          className="text-2xl font-bold text-slate-900 dark:text-slate-100 cursor-pointer tracking-tight"
          onClick={() => navigate('/')}
        >
          Foundr<span className="text-blue-600 dark:text-blue-400">Base</span>
        </h1>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Button
            size="sm"
            onClick={() => navigate('/create')}
            className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 theme-slate:bg-slate-600 theme-slate:hover:bg-slate-700 theme-forest:bg-lime-600 theme-forest:hover:bg-lime-500 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/messages')}
            className="rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 relative"
            title="Messages"
          >
            <MessageSquare className="h-4 w-4" />
            {/* Badge for unread messages - will connect to state later */}
            {/* <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span> */}
          </Button>
          
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
              title="Back to feed"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          
          <DropdownMenu
            align="end"
            trigger={
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                {getThemeIcon()}
                <ChevronDown className="h-3 w-3" />
              </button>
            }
          >
            <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Theme
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
            
            {(Object.keys(themeConfig) as Theme[]).map((themeKey) => {
              const config = themeConfig[themeKey]
              return (
                <DropdownMenuItem
                  key={themeKey}
                  onClick={() => handleThemeChange(themeKey)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: config.colors.primary }}
                  />
                  {config.name}
                  {theme === themeKey && (
                    <Check className="h-3.5 w-3.5 ml-auto text-blue-600 dark:text-blue-400" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenu>
          
          <DropdownMenu
            align="end"
            trigger={
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-semibold text-xs">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user?.username}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            }
          >
            <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {user?.email}
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
            
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="h-4 w-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => navigate('/profile?tab=posts')}>
              <FileText className="h-4 w-4 mr-2" />
              My Posts
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => navigate('/profile?tab=bookmarks')}>
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmarks
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => navigate('/network')}>
              <Users className="h-4 w-4 mr-2" />
              Network
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
            
            <DropdownMenuItem onClick={handleLogout} destructive>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
