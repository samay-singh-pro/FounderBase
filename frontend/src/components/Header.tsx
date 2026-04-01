import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { useAuthStore } from '@/store/authStore'
import { LogOut, Moon, Sun, Plus, RefreshCw, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'

interface HeaderProps {
  onRefresh?: () => void
  isRefreshing?: boolean
  showBackButton?: boolean
}

export default function Header({ onRefresh, isRefreshing = false, showBackButton = false }: HeaderProps) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const handleLogout = () => {
    clearAuth()
    navigate('/auth')
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
      <div className="max-w-8xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <h1 
          className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent dark:from-blue-500 dark:to-cyan-400 cursor-pointer" 
          onClick={() => navigate('/')}
        >
          FoundrBase
        </h1>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Button
            size="sm"
            onClick={() => navigate('/create')}
            className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create</span>
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
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="rounded-full hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-semibold text-xs">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {user?.username}
            </span>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-full">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
