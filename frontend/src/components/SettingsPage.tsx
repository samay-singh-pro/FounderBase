import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Settings as SettingsIcon,
  ArrowLeft,
  Check,
  Loader2,
  CheckCircle2,
  Circle
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, type Theme, themeConfig } from '@/stores/themeStore'

interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  bio?: string
  location?: string
  website?: string
  phone?: string
}

interface PrivacySettings {
  id: string
  user_id: string
  follow_request_privacy: 'anyone' | 'following_only' | 'none'
  message_request_privacy: 'anyone' | 'following_only' | 'none'
  hide_online_status: boolean
  notification_preference: 'all' | 'following_only' | 'none'
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    bio: '',
    location: '',
    website: '',
    phone: ''
  })
  
  // Account state
  const [accountForm, setAccountForm] = useState({
    newEmail: '',
    newUsername: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Privacy state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null)
  
  useEffect(() => {
    loadUserProfile()
    loadPrivacySettings()
  }, [])
  
  const loadUserProfile = async () => {
    try {
      const response = await api.get('/api/v1/auth/me')
      setProfile(response.data)
      setProfileForm({
        full_name: response.data.full_name || '',
        bio: response.data.bio || '',
        location: response.data.location || '',
        website: response.data.website || '',
        phone: response.data.phone || ''
      })
      
      // Apply saved theme if available
      if (response.data.theme && ['light', 'dark', 'slate', 'forest'].includes(response.data.theme)) {
        setTheme(response.data.theme as Theme)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }
  
  const loadPrivacySettings = async () => {
    try {
      const response = await api.get('/api/v1/settings/privacy')
      setPrivacySettings(response.data)
    } catch (error) {
      console.error('Failed to load privacy settings:', error)
    }
  }
  
  const handleSaveProfile = async () => {
    setLoading(true)
    setSaveSuccess(null)
    try {
      await api.put('/api/v1/auth/me', profileForm)
      setSaveSuccess('Profile updated successfully!')
      await loadUserProfile()
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }
  
  const handleChangeEmail = async () => {
    if (!accountForm.newEmail || !accountForm.currentPassword) {
      alert('Please fill in all fields')
      return
    }
    
    setLoading(true)
    try {
      await api.post('/api/v1/settings/change-email', {
        new_email: accountForm.newEmail,
        password: accountForm.currentPassword
      })
      setSaveSuccess('Email changed successfully!')
      setAccountForm(prev => ({ ...prev, newEmail: '', currentPassword: '' }))
      await loadUserProfile()
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to change email')
    } finally {
      setLoading(false)
    }
  }
  
  const handleChangeUsername = async () => {
    if (!accountForm.newUsername || !accountForm.currentPassword) {
      alert('Please fill in all fields')
      return
    }
    
    setLoading(true)
    try {
      await api.post('/api/v1/settings/change-username', {
        new_username: accountForm.newUsername,
        password: accountForm.currentPassword
      })
      setSaveSuccess('Username changed successfully!')
      setAccountForm(prev => ({ ...prev, newUsername: '', currentPassword: '' }))
      await loadUserProfile()
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to change username')
    } finally {
      setLoading(false)
    }
  }
  
  const handleChangePassword = async () => {
    if (!accountForm.currentPassword || !accountForm.newPassword || !accountForm.confirmPassword) {
      alert('Please fill in all password fields')
      return
    }
    
    if (accountForm.newPassword !== accountForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    
    if (accountForm.newPassword.length < 8) {
      alert('New password must be at least 8 characters')
      return
    }
    
    setLoading(true)
    try {
      await api.post('/api/v1/settings/change-password', {
        current_password: accountForm.currentPassword,
        new_password: accountForm.newPassword
      })
      setSaveSuccess('Password changed successfully!')
      setAccountForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSavePrivacySettings = async () => {
    if (!privacySettings) return
    
    setLoading(true)
    setSaveSuccess(null)
    try {
      await api.put('/api/v1/settings/privacy', {
        follow_request_privacy: privacySettings.follow_request_privacy,
        message_request_privacy: privacySettings.message_request_privacy,
        hide_online_status: privacySettings.hide_online_status,
        notification_preference: privacySettings.notification_preference
      })
      setSaveSuccess('Privacy settings updated successfully!')
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update privacy settings')
    } finally {
      setLoading(false)
    }
  }
  
  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme)
    
    // Save theme to backend
    try {
      const response = await api.put('/api/v1/auth/me', { theme: newTheme })
      // Update user in auth store
      if (response.data) {
        updateUser(response.data)
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-page-soft">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Hero — sophisticated dark surface */}
        <div className="hero-surface rounded-2xl mb-6 p-6 sm:p-7 shadow-sm">
          <div className="absolute inset-0 bg-grid-pattern opacity-50" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="hero-chip mb-3">
                <SettingsIcon className="h-3 w-3 hero-accent-text" />
                <span>Account control</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Settings
              </h1>
              <p className="text-sm opacity-70 mt-1">
                Manage your account, privacy, and appearance preferences.
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-14 h-14 shrink-0 rounded-xl border border-white/10 bg-white/[0.04]">
              <SettingsIcon className="h-6 w-6 hero-accent-text" />
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-200">
            <Check className="h-5 w-5" />
            <span>{saveSuccess}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="account">
              <SettingsIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your public profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter your full name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    placeholder="Tell us about yourself"
                    className="w-full min-h-[100px] px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500">
                    {profileForm.bio.length}/500 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={profileForm.website}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                
                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Email</CardTitle>
                <CardDescription>
                  Current email: {profile?.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_email">New Email</Label>
                  <Input
                    id="new_email"
                    type="email"
                    placeholder="newemail@example.com"
                    value={accountForm.newEmail}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, newEmail: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email_password">Current Password</Label>
                  <Input
                    id="email_password"
                    type="password"
                    placeholder="Enter your current password"
                    value={accountForm.currentPassword}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                
                <Button onClick={handleChangeEmail} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Change Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Username</CardTitle>
                <CardDescription>
                  Current username: @{profile?.username}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_username">New Username</Label>
                  <Input
                    id="new_username"
                    placeholder="newusername"
                    value={accountForm.newUsername}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, newUsername: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username_password">Current Password</Label>
                  <Input
                    id="username_password"
                    type="password"
                    placeholder="Enter your current password"
                    value={accountForm.currentPassword}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                
                <Button onClick={handleChangeUsername} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Change Username
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    placeholder="Enter your current password"
                    value={accountForm.currentPassword}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="Enter new password (min 8 characters)"
                    value={accountForm.newPassword}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Confirm new password"
                    value={accountForm.confirmPassword}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
                
                <Button onClick={handleChangePassword} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            {privacySettings && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Follow Requests</CardTitle>
                    <CardDescription>
                      Control who can send you follow requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <label 
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      onClick={() => setPrivacySettings(prev => prev ? { ...prev, follow_request_privacy: 'anyone' } : null)}
                    >
                      {privacySettings.follow_request_privacy === 'anyone' ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">Anyone</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Anyone can send you follow requests
                        </div>
                      </div>
                    </label>
                    
                    <label 
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      onClick={() => setPrivacySettings(prev => prev ? { ...prev, follow_request_privacy: 'following_only' } : null)}
                    >
                      {privacySettings.follow_request_privacy === 'following_only' ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">People You Follow</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Only people you follow can send requests
                        </div>
                      </div>
                    </label>
                    
                    <label 
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      onClick={() => setPrivacySettings(prev => prev ? { ...prev, follow_request_privacy: 'none' } : null)}
                    >
                      {privacySettings.follow_request_privacy === 'none' ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">No One</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Don't accept any follow requests
                        </div>
                      </div>
                    </label>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Message Requests</CardTitle>
                    <CardDescription>
                      Control who can send you messages
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <label 
                      onClick={() => setPrivacySettings(prev => prev ? { ...prev, message_request_privacy: 'anyone' } : null)}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      {privacySettings.message_request_privacy === 'anyone' ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">Anyone</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Anyone can message you
                        </div>
                      </div>
                    </label>
                    
                    <label 
                      onClick={() => setPrivacySettings(prev => prev ? { ...prev, message_request_privacy: 'following_only' } : null)}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      {privacySettings.message_request_privacy === 'following_only' ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">People You Follow</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Only people you follow can message you
                        </div>
                      </div>
                    </label>
                    
                    <label 
                      onClick={() => setPrivacySettings(prev => prev ? { ...prev, message_request_privacy: 'none' } : null)}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      {privacySettings.message_request_privacy === 'none' ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">No One</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Don't accept any messages
                        </div>
                      </div>
                    </label>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Online Status</CardTitle>
                    <CardDescription>
                      Control your online presence visibility
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={privacySettings.hide_online_status}
                        onChange={(e) => setPrivacySettings(prev => prev ? { ...prev, hide_online_status: e.target.checked } : null)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">Hide Online Status & Last Seen</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Others won't see when you're online or your last seen time. When enabled, you also won't see others' status.
                        </div>
                      </div>
                    </label>
                  </CardContent>
                </Card>
                
                <Button onClick={handleSavePrivacySettings} disabled={loading} className="w-full sm:w-auto">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Privacy Settings
                </Button>
              </>
            )}
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Choose your preferred color scheme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.keys(themeConfig) as Theme[]).map((themeKey) => {
                    const config = themeConfig[themeKey]
                    const isActive = theme === themeKey
                    return (
                      <button
                        key={themeKey}
                        onClick={() => handleThemeChange(themeKey)}
                        className={`group relative p-4 border-2 rounded-xl text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                          isActive
                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {/* Mini UI preview */}
                        <div
                          className="rounded-lg overflow-hidden border border-black/5 mb-3 shadow-sm"
                          style={{ backgroundColor: config.colors.background }}
                        >
                          <div
                            className="px-3 py-2 flex items-center gap-1.5"
                            style={{ backgroundColor: config.colors.accent }}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.colors.primary }} />
                            <div className="h-1.5 w-12 rounded-full opacity-60" style={{ backgroundColor: config.colors.foreground }} />
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="h-2 w-3/4 rounded-full opacity-80" style={{ backgroundColor: config.colors.foreground }} />
                            <div className="h-2 w-1/2 rounded-full opacity-40" style={{ backgroundColor: config.colors.foreground }} />
                            <div className="flex items-center gap-2 pt-1">
                              <div
                                className="h-5 w-14 rounded-md"
                                style={{ backgroundColor: config.colors.primary }}
                              />
                              <div
                                className="h-5 w-10 rounded-md"
                                style={{ backgroundColor: config.colors.accent }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {config.name}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {config.description}
                            </div>
                          </div>
                          {isActive && (
                            <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                              <Check className="h-3 w-3" />
                              Active
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            {privacySettings && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Control who can send you notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label 
                    onClick={() => setPrivacySettings(prev => prev ? { ...prev, notification_preference: 'all' } : null)}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    {privacySettings.notification_preference === 'all' ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium">All Notifications</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Get notified about all activity
                      </div>
                    </div>
                  </label>
                  
                  <label 
                    onClick={() => setPrivacySettings(prev => prev ? { ...prev, notification_preference: 'following_only' } : null)}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    {privacySettings.notification_preference === 'following_only' ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium">From People You Follow</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Only get notifications from people you follow
                      </div>
                    </div>
                  </label>
                  
                  <label 
                    onClick={() => setPrivacySettings(prev => prev ? { ...prev, notification_preference: 'none' } : null)}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    {privacySettings.notification_preference === 'none' ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium">No Notifications</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Don't send any notifications
                      </div>
                    </div>
                  </label>
                  
                  <Button onClick={handleSavePrivacySettings} disabled={loading} className="w-full sm:w-auto mt-4">
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Notification Settings
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
