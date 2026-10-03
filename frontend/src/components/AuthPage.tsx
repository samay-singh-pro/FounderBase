import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/stores/themeStore'
import {
  ArrowRight, AtSign, Eye, EyeOff, Heart, Lightbulb, Loader2, Lock, Mail, MessageCircle, MessagesSquare,
  ShieldCheck, Sparkles, Users,
} from 'lucide-react'

/**
 * Password input with a show/hide toggle. Wraps the shared <Input> so it keeps
 * the same styling; the eye button is overlaid on the right with padding to
 * keep typed text from running underneath it.
 */
function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={onChange}
          required
          disabled={disabled}
          autoComplete={autoComplete}
          className="h-11 rounded-xl pl-10 pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          disabled={disabled}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const { setTheme } = useThemeStore()
  const [activeTab, setActiveTab] = useState('login')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await authService.login({
        email: loginData.email,
        password: loginData.password,
      })
      
      setAuth(response.access_token, response.user)
      
      // Apply user's saved theme preference
      if (response.user.theme && ['light', 'dark', 'slate', 'forest'].includes(response.user.theme)) {
        setTheme(response.user.theme as 'light' | 'dark' | 'slate' | 'forest')
      }
      
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match!')
      setIsLoading(false)
      return
    }

    try {
      await authService.signup({
        email: signupData.email,
        username: signupData.username,
        password: signupData.password,
      })
      
      setSignupData({ email: '', username: '', password: '', confirmPassword: '' })
      setSuccessMessage('Account created successfully! Please sign in.')
      setActiveTab('login')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const switchTab = (value: string) => {
    setActiveTab(value)
    setError(null)
    setSuccessMessage(null)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-slate-950">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white">
        <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative text-2xl font-bold tracking-tight">
          Foundr<span className="text-blue-400">Base</span>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
            Where real problems meet the people who{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">solve them.</span>
          </h2>
          <p className="mt-5 text-lg text-slate-300">
            Share problems worth solving, pitch ideas, and find collaborators — farmers, engineers, teachers and founders,
            all in one place.
          </p>

          <ul className="mt-10 space-y-5">
            {[
              { icon: Lightbulb, title: 'Post problems, ideas & improvements', text: 'With photos, videos and categories' },
              { icon: Users, title: 'Follow builders you admire', text: 'Like, comment, bookmark and connect' },
              { icon: MessagesSquare, title: 'Real-time chat & groups', text: 'DMs, group chats, reactions, pinned messages' },
              { icon: Sparkles, title: 'AI writing assistant', text: 'Sharpen titles and refine your idea' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-slate-400">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative max-w-sm rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-blue-200">farming</span>
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-violet-200">idea</span>
          </div>
          <p className="mt-3 font-semibold leading-snug">Pay-per-crate cold storage that farmers can book over WhatsApp</p>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <div className="flex -space-x-2">
              {['bg-blue-400', 'bg-pink-400', 'bg-amber-400', 'bg-emerald-400'].map((c) => (
                <span key={c} className={`h-7 w-7 rounded-full ${c} ring-2 ring-slate-900`} />
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> 24</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> 9</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Foundr<span className="text-blue-600 dark:text-blue-400">Base</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {activeTab === 'login'
              ? 'Sign in to see what the community is building.'
              : 'Join in a minute — share your first idea today.'}
          </p>

          <Tabs value={activeTab} onValueChange={switchTab} className="mt-8 w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg">Sign Up</TabsTrigger>
            </TabsList>

            {successMessage && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4 shrink-0" /> {successMessage}
              </div>
            )}
            {error && (
              <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <IconField id="login-email" label="Email" icon={Mail}>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className={INPUT_CLASS}
                  />
                </IconField>
                <PasswordField
                  id="login-password"
                  label="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <SubmitButton loading={isLoading} label="Sign in" />
              </form>
              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                New to FoundrBase?{' '}
                <button type="button" onClick={() => switchTab('signup')} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Create an account
                </button>
              </p>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-5">
                <IconField id="signup-email" label="Email" icon={Mail}>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className={INPUT_CLASS}
                  />
                </IconField>
                <IconField id="signup-username" label="Username" icon={AtSign}>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="johndoe"
                    value={signupData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupData({ ...signupData, username: e.target.value })}
                    required
                    disabled={isLoading}
                    minLength={3}
                    maxLength={50}
                    autoComplete="username"
                    className={INPUT_CLASS}
                  />
                </IconField>
                <PasswordField
                  id="signup-password"
                  label="Password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="signup-confirm-password"
                  label="Confirm password"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <SubmitButton loading={isLoading} label="Create account" />
              </form>
              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button type="button" onClick={() => switchTab('login')} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Sign in
                </button>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

const INPUT_CLASS = 'h-11 rounded-xl pl-10'

/** Label + input with a leading icon. */
function IconField({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  )
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="group h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-cyan-600"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </Button>
  )
}
