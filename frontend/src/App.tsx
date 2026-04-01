import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import AuthPage from './components/AuthPage'
import LandingPage from './components/LandingPage'
import CreateOpportunityPage from './components/CreateOpportunityPage'
import OpportunityDetailPage from './components/OpportunityDetailPage'
import Header from './components/Header'
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
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateOpportunityPage />} />
          <Route path="/edit/:id" element={<CreateOpportunityPage />} />
          <Route path="/opportunity/:id" element={<OpportunityDetailPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
