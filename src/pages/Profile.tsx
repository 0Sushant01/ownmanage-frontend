import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'

interface ProfileData {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    full_name: string
  }
  employee?: {
    id: string
    employee_id?: string
    first_name: string
    last_name: string
    email: string
    phone: string
    designation: string
    joining_date: string
    department?: string
    branch?: string
    manager?: string
  } | null
  role?: string
  business?: {
    id: string
    name: string
  } | null
}

export const Profile: React.FC = () => {
  const { refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  })

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/profile/')
      setProfile(res.data)
      setFormData({
        first_name: res.data.user.first_name || '',
        last_name: res.data.user.last_name || '',
        phone: res.data.user.phone || '',
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      await apiClient.patch('/profile/', formData)
      await refreshUser()
      setSuccess('Profile updated successfully.')
      loadProfile()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">User Profile</h1>
        <p className="text-sm text-slate-400 mt-1">
          View your organizational credentials and update personal contact details.
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
          <p className="text-sm">Loading user profile...</p>
        </div>
      ) : profile ? (
        <div className="space-y-8">
          {/* Identity & Role Badge Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-slate-950 text-2xl shadow-lg">
                {profile.user.first_name?.[0] || profile.user.email[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{profile.user.full_name || profile.user.email}</h2>
                <p className="text-sm text-slate-400">{profile.user.email}</p>
                {profile.employee?.designation && (
                  <p className="text-xs text-emerald-400 font-medium mt-0.5">
                    {profile.employee.designation}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Platform Role
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-xs font-bold">
                {profile.role}
              </span>
            </div>
          </div>

          {/* Organizational Employment Data (Read-Only) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Employment Information</h3>
                <p className="text-xs text-slate-400">Fixed institutional properties assigned by administration.</p>
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-mono px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                🔒 Protected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Organization</span>
                <span className="text-white font-medium text-sm">
                  {profile.business?.name || 'Platform Administrator'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Employee Badge ID</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {profile.employee?.employee_id || 'Not Assigned'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Department</span>
                <span className="text-white font-medium text-sm">
                  {profile.employee?.department || 'General'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Branch</span>
                <span className="text-white font-medium text-sm">
                  {profile.employee?.branch || 'Headquarters'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Reporting Manager</span>
                <span className="text-white font-medium text-sm">
                  {profile.employee?.manager || 'None (Direct Report / Admin)'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Date Joined</span>
                <span className="text-white font-mono text-sm">
                  {profile.employee?.joining_date || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Editable Personal Details Form */}
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Editable Personal Profile</h3>
              <p className="text-xs text-slate-400">
                Update your display name and contact phone number.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={profile.user.email}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Email serves as login identifier and cannot be modified directly.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export default Profile
