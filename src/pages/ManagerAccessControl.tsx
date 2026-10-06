import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../services/api'
import { usePermission } from '../context/AuthContext'
import { ToggleSwitch } from '../components/ToggleSwitch'
import type { ManagerAccessControlData, PermissionItem } from '../types'

export const ManagerAccessControl: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { isAdmin } = usePermission()

  const [managers, setManagers] = useState<any[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState<string>(id || '')
  const [macData, setMacData] = useState<ManagerAccessControlData | null>(null)
  const [permissionStates, setPermissionStates] = useState<Record<string, boolean>>({})

  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Fetch managers list
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await apiClient.get('/managers/')
        setManagers(res.data)
        if (!selectedManagerId && res.data.length > 0) {
          setSelectedManagerId(res.data[0].id)
        }
      } catch (err: any) {
        console.error('Failed to load managers', err)
      }
    }
    fetchManagers()
  }, [])

  // Load Access Control permissions for the selected manager
  const loadAccessControl = async (mgrId: string) => {
    if (!mgrId) return
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await apiClient.get(`/managers/${mgrId}/access-control/`)
      setMacData(res.data)

      // Initialize checkbox states from backend response
      const initialMap: Record<string, boolean> = {}
      Object.values(res.data.modules as Record<string, { permissions: PermissionItem[] }>).forEach((mod) => {
        mod.permissions.forEach((p) => {
          initialMap[p.key] = !!p.is_granted
        })
      })
      setPermissionStates(initialMap)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load manager permissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedManagerId) {
      loadAccessControl(selectedManagerId)
    }
  }, [selectedManagerId])

  const handleToggle = (key: string) => {
    setPermissionStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleToggleModule = (moduleKey: string, grant: boolean) => {
    if (!macData?.modules[moduleKey]) return
    setPermissionStates((prev) => {
      const updated = { ...prev }
      macData.modules[moduleKey].permissions.forEach((p) => {
        updated[p.key] = grant
      })
      return updated
    })
  }

  const handleSave = async () => {
    if (!selectedManagerId) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const payload = {
        permissions: Object.entries(permissionStates).map(([permission_key, is_granted]) => ({
          permission_key,
          is_granted,
        })),
      }
      const res = await apiClient.put(`/managers/${selectedManagerId}/access-control/`, payload)
      setMacData(res.data)
      setSuccessMsg(`Permissions updated successfully! ${res.data.granted_count} permissions currently active.`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update manager permissions.')
    } finally {
      setSaving(false)
    }
  }

  const grantedCount = Object.values(permissionStates).filter(Boolean).length
  const totalCount = Object.keys(permissionStates).length

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-400">
        Only Enterprise Administrators can configure Manager Access Control.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/managers')}
              className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
            >
              ← Back to Managers
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Manager Access Control</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure granular operational permissions granted to Center Managers
          </p>
        </div>

        {/* Manager Selector */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <label className="text-xs font-medium text-slate-400 pl-2">Manager:</label>
          <select
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.user?.full_name || m.user?.email} — {m.branch?.name || 'All Centers'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Manager Summary Banner */}
      {macData?.manager && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl font-bold text-blue-400">
              {macData.manager.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">{macData.manager.name}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-900/40 text-blue-300 border border-blue-800">
                  {macData.manager.branch_name}
                </span>
              </div>
              <p className="text-xs text-slate-400">{macData.manager.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Active Grants</span>
              <span className="text-sm font-semibold text-emerald-400">
                {grantedCount} of {totalCount} permissions
              </span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl font-medium text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-sm">
          {successMsg}
        </div>
      )}

      {/* Permissions Modules Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : macData?.modules ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(macData.modules).map(([moduleKey, mod]) => {
            const modPerms = mod.permissions
            const modGrantedCount = modPerms.filter((p) => permissionStates[p.key]).length

            return (
              <div
                key={moduleKey}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{mod.module_display}</h4>
                      <span className="text-[11px] text-slate-400">
                        {modGrantedCount} of {modPerms.length} granted
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleModule(moduleKey, true)}
                        className="text-[11px] font-medium text-emerald-400 hover:underline"
                      >
                        All
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleModule(moduleKey, false)}
                        className="text-[11px] font-medium text-slate-400 hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {modPerms.map((p) => {
                      const isChecked = !!permissionStates[p.key]
                      return (
                        <div
                          key={p.key}
                          className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition ${
                            isChecked
                              ? 'bg-emerald-950/20 border-emerald-900/60 shadow-xs'
                              : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-200">{p.name}</span>
                              <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-800/60">
                                {p.scope}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{p.description}</p>
                          </div>
                          <ToggleSwitch
                            id={`perm-${p.key}`}
                            checked={isChecked}
                            onChange={() => handleToggle(p.key)}
                            size="sm"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Bottom Save Button */}
      {!loading && macData && (
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl font-medium text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
