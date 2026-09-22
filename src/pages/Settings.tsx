import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Business } from '../types'

export const Settings: React.FC = () => {
  const { business: currentBizSummary, role } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    employee_id_enabled: true,
    employee_id_prefix: 'ABC',
  })

  const loadBusiness = async () => {
    try {
      setLoading(true)
      // If SuperAdmin or BusinessAdmin, fetch details of active business
      if (!currentBizSummary?.id) return
      const res = await apiClient.get(`/businesses/${currentBizSummary.id}/`)
      setBusiness(res.data)
      setFormData({
        name: res.data.name || '',
        legal_name: res.data.legal_name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        timezone: res.data.timezone || 'Asia/Kolkata',
        currency: res.data.currency || 'INR',
        employee_id_enabled: res.data.employee_id_enabled ?? true,
        employee_id_prefix: res.data.employee_id_prefix || 'EMP',
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load business settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBusiness()
  }, [currentBizSummary?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBizSummary?.id) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const res = await apiClient.patch(`/businesses/${currentBizSummary.id}/`, formData)
      setBusiness(res.data)
      setSuccess('Business settings updated successfully.')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (role !== 'SUPERADMIN' && role !== 'BUSINESS_ADMIN') {
    return (
      <div className="p-10 max-w-4xl mx-auto text-center">
        <p className="text-rose-400">Settings are reserved for Business Administrators.</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Business Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your organizational profile, regional localization, and sequential employee ID policies.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
          <p className="text-sm">Loading business configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Information Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Organization Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Legal Registered Name</label>
                <input
                  type="text"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primary Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primary Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                  <option value="UTC">UTC (GMT +00:00)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (BST/GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (+04:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (+08:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Currency Code</label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Employee ID Configuration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Employee ID Scheme</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure whether new staff automatically receive a sequential company badge ID.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.employee_id_enabled}
                  onChange={(e) => setFormData({ ...formData, employee_id_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-semibold text-white">Enable Automatic Employee IDs</span>
                  <span className="text-xs text-slate-400 block">
                    When enabled, the backend increments and generates unique IDs upon onboarding.
                  </span>
                </div>
              </label>

              {formData.employee_id_enabled && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">ID Prefix</label>
                      <input
                        type="text"
                        maxLength={10}
                        required={formData.employee_id_enabled}
                        value={formData.employee_id_prefix}
                        onChange={(e) => setFormData({ ...formData, employee_id_prefix: e.target.value.toUpperCase() })}
                        placeholder="e.g. ACME"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Next Number Sequence</label>
                      <input
                        type="text"
                        disabled
                        value={business ? String(business.employee_id_next_number).padStart(3, '0') : '001'}
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 font-mono cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Managed atomically by the backend to prevent collisions.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-xs text-emerald-300">
                    <span className="font-semibold">Live Preview: </span>
                    <span className="font-mono text-emerald-200">
                      {formData.employee_id_prefix}
                      {business ? String(business.employee_id_next_number).padStart(3, '0') : '001'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {saving ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default Settings
