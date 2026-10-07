import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnCard } from '../design-system/components/OwnCard'

export const Login: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const cleanEmail = email.trim().toLowerCase()
      const role = await login(cleanEmail, password)
      if (role === 'SUPERADMIN') {
        navigate('/dashboard')
      } else if (role === 'BROKER') {
        navigate('/broker/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (!err.response) {
        setError(
          err.message?.includes('Network Error')
            ? 'Network Error: Cannot connect to backend server at http://localhost:8000. Please ensure the backend is running.'
            : (err.message || 'Cannot reach backend server. Please verify your connection.')
        )
      } else {
        const msg =
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          'Authentication failed. Please check your email and password.'
        setError(Array.isArray(msg) ? msg[0] : msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (userEmail: string) => {
    setEmail(userEmail)
    setPassword('123456')
    setError(null)
  }

  return (
    <div
      className="min-h-screen min-h-dvh bg-background text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 relative font-sans antialiased transition-colors"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute right-4 z-10" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        <ThemeToggle size="sm" showLabels={false} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 rounded-2xl bg-primary items-center justify-center font-extrabold text-primary-foreground text-xl mb-4 shadow-lg shadow-primary/20">
          OM
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">OwnManage</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Multi-tenant attendance & workforce management platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <OwnCard className="py-8 px-6 shadow-2xl sm:px-10 border border-border">
          {error && (
            <div className="mb-5 bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full min-h-11 bg-card border border-border rounded-xl px-4 py-2.5 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-11 bg-card border border-border rounded-xl pl-4 pr-11 py-2.5 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'View password'}
                  className="absolute right-0 inset-y-0 px-3.5 flex items-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <OwnButton
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Sign In to Dashboard
            </OwnButton>
          </form>

          <div className="mt-4 text-center">
            <Link to="/activate" className="text-xs text-muted-foreground hover:text-foreground transition">
              Have a temporary code? <span className="text-primary font-semibold hover:underline">Activate Account</span>
            </Link>
          </div>

          {/* Quick-fill development logins */}
          <div className="mt-6 border-t border-border pt-5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">
              Quick Test Accounts (Password: <span className="text-primary font-mono font-bold">123456</span>)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('superadmin@ownmanage.in')}
                className="p-2.5 bg-muted/60 hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground text-left truncate transition cursor-pointer"
              >
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-mono font-semibold">SUPERADMIN</span>
                <span className="truncate block font-medium">superadmin@ownmanage.in</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('broker@ownmanage.in')}
                className="p-2.5 bg-muted/60 hover:bg-muted border border-border hover:border-amber-500/50 rounded-xl text-foreground text-left truncate transition cursor-pointer"
              >
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-mono font-semibold">BROKER PARTNER</span>
                <span className="truncate block font-medium">broker@ownmanage.in</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@acme.com')}
                className="p-2.5 bg-muted/60 hover:bg-muted border border-border hover:border-emerald-500/50 rounded-xl text-foreground text-left truncate transition cursor-pointer"
              >
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono font-semibold">BUSINESS ADMIN</span>
                <span className="truncate block font-medium">admin@acme.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('manager1@acme.com')}
                className="p-2.5 bg-muted/60 hover:bg-muted border border-border hover:border-blue-500/50 rounded-xl text-foreground text-left truncate transition cursor-pointer"
              >
                <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-mono font-semibold">MANAGER 1</span>
                <span className="truncate block font-medium">manager1@acme.com</span>
              </button>
            </div>
          </div>
        </OwnCard>
      </div>
    </div>
  )
}
