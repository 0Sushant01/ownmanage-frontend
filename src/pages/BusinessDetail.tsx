import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../services/api'
import type { Business } from '../types'

export const BusinessDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminCreating, setAdminCreating] = useState(false)
  const [adminData, setAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [bizRes, statsRes] = await Promise.all([
        apiClient.get(`/businesses/${id}/`),
        apiClient.get(`/businesses/${id}/stats/`),
      ])
      setBusiness(bizRes.data)
      setStats(statsRes.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load business details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleToggleStatus = async () => {
    if (!business) return
    try {
      const res = await apiClient.patch(`/businesses/${id}/`, {
        is_active: !business.is_active,
      })
      setBusiness(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status.')
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminCreating(true)
    setAdminSuccess(null)
    try {
      const res = await apiClient.post(`/businesses/${id}/create-admin/`, adminData)
      setAdminSuccess(res.data.detail || 'Business Admin created successfully!')
      setAdminData({ first_name: '', last_name: '', email: '', phone: '', password: '' })
      setTimeout(() => setShowAdminModal(false), 2000)
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to create business admin.')
    } finally {
      setAdminCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading tenant details...
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-rose-950/40 border border-rose-900 text-rose-300 p-4 rounded-xl">{error}</div>
        <Link to="/businesses" className="mt-4 inline-block text-xs text-emerald-400">← Back to Businesses</Link>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/businesses" className="text-xs text-slate-400 hover:text-white transition">
            ← Back to Directory
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">{business.name}</h1>
          <p className="text-xs text-slate-400 font-mono">ID: {business.id}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
              business.is_active
                ? 'bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border-rose-800'
                : 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800'
            }`}
          >
            {business.is_active ? 'Deactivate Business' : 'Activate Business'}
          </button>
          <button
            onClick={() => setShowAdminModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-500/10"
          >
            + Create Business Admin
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</span>
          <div className="text-2xl font-bold text-white mt-1">{stats?.total_employees ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Present Today</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.present_today ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absent Today</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats?.absent_today ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">On Leave</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats?.on_leave ?? 0}</div>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Tenant Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-1">Official Legal Name</span>
            <span className="text-white font-medium">{business.legal_name || 'Not provided'}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Contact Email / Phone</span>
            <span className="text-white font-medium">{business.email || '—'} / {business.phone || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Location</span>
            <span className="text-white font-medium">{business.city || '—'}, {business.state || '—'}, {business.country}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Timezone & Currency</span>
            <span className="text-white font-mono">{business.timezone} / {business.currency}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Employee ID Sequence</span>
            <span className="text-emerald-400 font-mono">
              {business.employee_id_enabled ? `Prefix: ${business.employee_id_prefix}, Next: #${business.employee_id_next_number}` : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Registration Date</span>
            <span className="text-slate-400 font-mono">{new Date(business.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Business Administrator</h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {adminSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl">
                {adminSuccess}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={adminData.first_name}
                    onChange={(e) => setAdminData({ ...adminData, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={adminData.last_name}
                    onChange={(e) => setAdminData({ ...adminData, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="admin@tenant.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={adminData.phone}
                  onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminCreating}
                  className="px-5 py-2 bg-emerald-500 text-slate-950 rounded-xl font-semibold disabled:opacity-50"
                >
                  {adminCreating ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
