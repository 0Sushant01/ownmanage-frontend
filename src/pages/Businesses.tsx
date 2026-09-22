import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../services/api'
import type { Business } from '../types'

export const Businesses: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create Business Modal State
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    employee_id_enabled: true,
    employee_id_prefix: 'EMP',
  })

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/businesses/')
      setBusinesses(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load businesses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiClient.post('/businesses/', formData)
      setShowModal(false)
      setFormData({
        name: '',
        legal_name: '',
        email: '',
        phone: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        employee_id_enabled: true,
        employee_id_prefix: 'EMP',
      })
      await fetchBusinesses()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create business.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Businesses Directory</h1>
          <p className="text-sm text-slate-400">Manage all tenant businesses on the OwnManage platform.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-1"
        >
          <span>+ Create Business</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-slate-500">
          Loading businesses...
        </div>
      ) : error ? (
        <div className="bg-rose-950/40 border border-rose-900 text-rose-300 p-4 rounded-xl">{error}</div>
      ) : businesses.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          No businesses registered yet. Click &quot;Create Business&quot; to register your first tenant.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Timezone / Currency</th>
                <th className="px-6 py-4">Emp ID Prefix</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-semibold text-white">
                    <Link to={`/businesses/${b.id}`} className="hover:text-emerald-400 transition">
                      {b.name}
                    </Link>
                    <span className="block text-xs font-normal text-slate-400">{b.email || 'No email registered'}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {b.city || '—'}, {b.country}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">
                    {b.timezone} / {b.currency}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-emerald-400">
                    {b.employee_id_enabled ? b.employee_id_prefix : 'Disabled'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                        b.is_active
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                          : 'bg-rose-950/60 border-rose-800 text-rose-400'
                      }`}
                    >
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/businesses/${b.id}`}
                      className="text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 transition"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Create New Business Tenant</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Zenith Tech Solutions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@zenith.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9999988888"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Timezone</label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Auto Employee ID</label>
                  <select
                    value={formData.employee_id_enabled ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, employee_id_enabled: e.target.value === 'true' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Employee ID Prefix</label>
                  <input
                    type="text"
                    value={formData.employee_id_prefix}
                    onChange={(e) => setFormData({ ...formData, employee_id_prefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. ZEN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Register Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
