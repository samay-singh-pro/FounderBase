import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import AuthPage from './components/AuthPage'
import LandingPage from './components/LandingPage'
import CreateOpportunityPage from './components/CreateOpportunityPage'
import OpportunityDetailPage from './components/OpportunityDetailPage'
import MessagesPage from './components/MessagesPage'
import ProfilePage from './components/ProfilePage'
import UserProfilePage from './components/UserProfilePage'
import NetworkPage from './components/NetworkPage'
import SettingsPage from './components/SettingsPage'
import Header from './components/Header'
import { ToastContainer } from './components/ui/toast'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './stores/themeStore'

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }
  
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

function App() {
  const user = useAuthStore((state) => state.user)
  const { setTheme } = useThemeStore()
  
  // Apply saved theme on app load
  useEffect(() => {
    if (user?.theme && ['light', 'dark', 'slate', 'forest'].includes(user.theme)) {
      setTheme(user.theme as 'light' | 'dark' | 'slate' | 'forest')
    }
  }, [user, setTheme])
  
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateOpportunityPage />} />
          <Route path="/edit/:id" element={<CreateOpportunityPage />} />
          <Route path="/opportunity/:id" element={<OpportunityDetailPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/user/:username" element={<UserProfilePage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
