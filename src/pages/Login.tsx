import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Login: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const role = await login(email, password)
      if (role === 'SUPERADMIN') {
        navigate('/businesses')
      } else if (role === 'BROKER') {
        navigate('/broker/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Authentication failed. Please check credentials.'
      setError(msg)
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
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
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
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
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3 text-center">
              Quick Test Accounts (Password: Dev@123456)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('superadmin@ownmanage.in')}
                className="p-2 bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-lg text-slate-300 text-left truncate transition"
              >
                <span className="text-[10px] text-purple-400 block font-mono">SUPERADMIN</span>
                superadmin@ownmanage.in
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('broker@ownmanage.in')}
                className="p-2 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-lg text-slate-300 text-left truncate transition"
              >
                <span className="text-[10px] text-amber-400 block font-mono">BROKER PARTNER</span>
                broker@ownmanage.in
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@acme.com')}
                className="p-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-slate-300 text-left truncate transition"
              >
                <span className="text-[10px] text-emerald-400 block font-mono">BUSINESS ADMIN</span>
                admin@acme.com
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('manager1@acme.com')}
                className="p-2 bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-lg text-slate-300 text-left truncate transition"
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
