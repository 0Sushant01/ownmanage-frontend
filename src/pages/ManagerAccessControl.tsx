import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../services/api'
import { usePermission } from '../context/AuthContext'
import { ToggleSwitch } from '../components/ToggleSwitch'
import type { ManagerAccessControlData, PermissionItem } from '../types'
import {
  OwnCard,
  OwnButton,
  OwnBadge,
  OwnPageHeader,
} from '../design-system'
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

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

  // Synchronize with URL param if route id changes
  useEffect(() => {
    if (id && id !== selectedManagerId) {
      setSelectedManagerId(id)
    }
  }, [id])

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
      if (res.data.modules) {
        Object.values(res.data.modules as Record<string, { permissions: PermissionItem[] }>).forEach((mod) => {
          mod.permissions.forEach((p) => {
            initialMap[p.key] = !!p.is_granted
          })
        })
      }
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
      <div className="p-8 text-center text-muted-foreground">
        Only Enterprise Administrators can configure Manager Access Control.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/managers')}
            className="text-muted-foreground hover:text-foreground transition text-sm flex items-center gap-1.5 cursor-pointer mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Managers</span>
          </button>
          <OwnPageHeader
            title="Manager Access Control"
            description="Configure granular operational permissions granted to Center Managers"
          />
        </div>

        {/* Manager Selector */}
        <div className="flex items-center gap-2.5 bg-card border border-border p-2 rounded-xl shadow-xs self-start md:self-auto">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-2">Manager:</label>
          <select
            value={selectedManagerId}
            onChange={(e) => {
              const newId = e.target.value
              setSelectedManagerId(newId)
              navigate(`/managers/${newId}/access-control`)
            }}
            className="bg-card border border-border hover:border-border-strong focus:border-ring rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground cursor-pointer shadow-xs"
          >
            {managers.map((m) => (
              <option key={m.id} value={m.id} className="bg-card text-foreground">
                {m.user?.full_name || m.user?.email} — {m.branch?.name || 'All Centers'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Manager Summary Banner */}
      {macData?.manager && (
        <OwnCard className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shadow-xs">
              {macData.manager.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">{macData.manager.name}</h3>
                <OwnBadge variant="primary" size="sm">
                  {macData.manager.branch_name}
                </OwnBadge>
              </div>
              <p className="text-xs text-muted-foreground">{macData.manager.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Active Grants</span>
              <span className="text-sm font-semibold text-primary">
                {grantedCount} of {totalCount} permissions
              </span>
            </div>

            <OwnButton
              onClick={handleSave}
              loading={saving}
              variant="primary"
            >
              Save Permissions
            </OwnButton>
          </div>
        </OwnCard>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Permissions Modules Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 bg-card rounded-2xl border border-border shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : macData?.modules ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(macData.modules).map(([moduleKey, mod]) => {
            const modPerms = mod.permissions
            const modGrantedCount = modPerms.filter((p) => permissionStates[p.key]).length

            return (
              <OwnCard
                key={moduleKey}
                className="p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{mod.module_display}</h4>
                      <span className="text-[11px] text-muted-foreground">
                        {modGrantedCount} of {modPerms.length} granted
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleModule(moduleKey, true)}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleModule(moduleKey, false)}
                        className="text-[11px] font-semibold text-muted-foreground hover:underline cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {modPerms.map((p) => {
                      const isChecked = !!permissionStates[p.key]
                      return (
                        <div
                          key={p.key}
                          className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition ${
                            isChecked
                              ? 'bg-primary/5 border-primary/30 shadow-xs'
                              : 'bg-muted/30 border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-semibold text-foreground">{p.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border">
                                {p.scope}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.description}</p>
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
              </OwnCard>
            )
          })}
        </div>
      ) : null}

      {/* Bottom Save Button */}
      {!loading && macData && (
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
          <OwnButton
            onClick={handleSave}
            loading={saving}
            variant="primary"
          >
            Save All Changes
          </OwnButton>
        </div>
      )}
    </div>
  )
}

export default ManagerAccessControl
