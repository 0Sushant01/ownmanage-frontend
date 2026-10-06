import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

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
        setError(msg)
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
    <div className="min-h-screen min-h-dvh bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 relative font-sans antialiased" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="absolute right-4 z-10" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        <ThemeToggle size="sm" />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-500 items-center justify-center font-bold text-slate-950 text-2xl mb-4 shadow-lg shadow-emerald-500/20">
          OM
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">OwnManage</h2>
        <p className="mt-2 text-sm text-slate-400">
          Multi-tenant attendance & salary management platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full min-h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-11 bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-2.5 text-base md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'View password'}
                  title={showPassword ? 'Hide password' : 'View password'}
                  className="absolute inset-y-0 right-0 min-w-11 min-h-11 pr-3.5 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-12 flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold tracking-tight text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/activate" className="text-xs text-slate-400 hover:text-white transition">
              Have a temporary code? <span className="text-emerald-400 font-medium">Activate Account</span>
            </Link>
          </div>

          {/* Quick-fill development logins */}
          <div className="mt-6 border-t border-slate-800/80 pt-5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Quick Test Accounts (Password: <span className="text-emerald-400 font-mono font-bold">123456</span>)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('superadmin@ownmanage.in')}
                className="min-h-11 p-2.5 bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-lg text-slate-300 text-left truncate transition"
              >
                <span className="text-[10px] text-purple-400 block font-mono">SUPERADMIN</span>
                superadmin@ownmanage.in
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('broker@ownmanage.in')}
                className="min-h-11 p-2.5 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-lg text-slate-300 text-left truncate transition"
              >
                <span className="text-[10px] text-amber-400 block font-mono">BROKER PARTNER</span>
                broker@ownmanage.in
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@acme.com')}
                className="min-h-11 p-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-slate-300 text-left truncate transition"
              >
                <span className="text-[10px] text-emerald-400 block font-mono">BUSINESS ADMIN</span>
                admin@acme.com
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('manager1@acme.com')}
                className="min-h-11 p-2.5 bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-lg text-slate-300 text-left truncate transition"
              >
                <span className="text-[10px] text-blue-400 block font-mono">MANAGER 1</span>
                manager1@acme.com
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
