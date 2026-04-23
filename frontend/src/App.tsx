import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import AuthPage from './components/AuthPage'
import LandingPage from './components/LandingPage'
import CreateOpportunityPage from './components/CreateOpportunityPage'
import OpportunityDetailPage from './components/OpportunityDetailPage'
import MessagesPage from './components/MessagesPage'
import Header from './components/Header'
import { ToastContainer } from './components/ui/toast'
import { useAuthStore } from './store/authStore'

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
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
