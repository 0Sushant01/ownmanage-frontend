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
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Lock,
  Unlock,
} from 'lucide-react'

export const ManagerAccessControl: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { isAdmin } = usePermission()

  const [managers, setManagers] = useState<any[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState<string>(id || '')
  const [macData, setMacData] = useState<ManagerAccessControlData | null>(null)
  const [permissionStates, setPermissionStates] = useState<Record<string, boolean>>({})
  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [resetting, setResetting] = useState<boolean>(false)
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
        } else if (selectedManagerId && res.data.length > 0) {
          const match = res.data.find(
            (m: any) => m.id === selectedManagerId || m.user_id === selectedManagerId
          )
          if (match && match.id !== selectedManagerId) {
            setSelectedManagerId(match.id)
          }
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
      setOverrideEnabled(Boolean(res.data.has_override))

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
    if (!overrideEnabled) return
    setPermissionStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleToggleModule = (moduleKey: string, grant: boolean) => {
    if (!overrideEnabled || !macData?.modules[moduleKey]) return
    setPermissionStates((prev) => {
      const updated = { ...prev }
      macData.modules[moduleKey].permissions.forEach((p) => {
        updated[p.key] = grant
      })
      return updated
    })
  }

  const handleToggleOverride = async () => {
    if (overrideEnabled) {
      const mgrName = macData?.manager?.name || 'this manager'
      if (!window.confirm(`Revert permissions for ${mgrName} to Enterprise Default permissions?\n\nThis will remove manager-specific overrides, and future enterprise default updates will automatically apply to this manager.`)) {
        return
      }
      setResetting(true)
      setError(null)
      setSuccessMsg(null)
      try {
        const res = await apiClient.delete(`/managers/${selectedManagerId}/access-control/`)
        setMacData(res.data)
        setOverrideEnabled(false)

        const initialMap: Record<string, boolean> = {}
        if (res.data.modules) {
          Object.values(res.data.modules as Record<string, { permissions: PermissionItem[] }>).forEach((mod) => {
            mod.permissions.forEach((p) => {
              initialMap[p.key] = !!p.is_granted
            })
          })
        }
        setPermissionStates(initialMap)
        setSuccessMsg(res.data.detail || 'Reverted to Enterprise Default manager permissions.')
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to reset manager permissions.')
      } finally {
        setResetting(false)
      }
    } else {
      setOverrideEnabled(true)
      setSuccessMsg('Manager Override mode activated! You can now customize permissions specifically for this manager without affecting or being affected by other centres or enterprise defaults.')
    }
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
      setOverrideEnabled(true)
      setSuccessMsg(`Permissions saved! Override is active with ${res.data.granted_count} permissions granted. Future enterprise default updates will not overwrite this manager.`)
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
            description="Configure granular operational permissions granted to Center Managers with conflict-free override isolation"
          />
        </div>

        {/* Manager Selector */}
        <div className="flex items-center gap-2.5 bg-card border border-border p-2 rounded-xl shadow-xs self-start md:self-auto">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-2 shrink-0">Manager:</label>
          <select
            value={selectedManagerId}
            onChange={(e) => {
              const newId = e.target.value
              setSelectedManagerId(newId)
              navigate(`/managers/${newId}/access-control`)
            }}
            className="bg-card border border-border hover:border-border-strong focus:border-ring rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground cursor-pointer shadow-xs max-w-[280px] sm:max-w-[360px] truncate"
          >
            {managers.map((m) => {
              const name = m.full_name || (m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : '') || m.email || m.user?.full_name || m.user?.email || 'Manager'
              const branch = m.branch_name || m.branch?.name || 'All Centers'
              const empCode = m.employee_id ? ` (${m.employee_id})` : ''
              return (
                <option key={m.id} value={m.id} className="bg-card text-foreground">
                  {name}{empCode} — {branch}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Manager Summary Banner */}
      {macData?.manager && (
        <OwnCard className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shadow-xs shrink-0">
              {(macData.manager.name || macData.manager.email || 'M').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-base truncate">
                  {macData.manager.name || macData.manager.email}
                </h3>
                <OwnBadge variant="primary" size="sm">
                  {macData.manager.branch_name || 'All Centers'}
                </OwnBadge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{macData.manager.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Active Grants</span>
              <span className="text-sm font-semibold text-primary">
                {grantedCount} of {totalCount} permissions
              </span>
            </div>

            <OwnButton
              onClick={handleSave}
              loading={saving}
              disabled={!overrideEnabled}
              variant="primary"
            >
              Save Permissions
            </OwnButton>
          </div>
        </OwnCard>
      )}

      {/* Override Status Banner */}
      <OwnCard className={`p-4 border transition-all ${overrideEnabled ? 'bg-amber-500/5 border-amber-500/30' : 'bg-primary/5 border-primary/20'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${overrideEnabled ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
              {overrideEnabled ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-foreground">
                  {overrideEnabled ? 'Manager Access Override: ENABLED' : 'Enterprise Role Defaults: ACTIVE'}
                </h4>
                <OwnBadge variant={overrideEnabled ? 'warning' : 'primary'} size="sm">
                  {overrideEnabled ? 'Decoupled Override' : 'Inheriting Defaults'}
                </OwnBadge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                {overrideEnabled
                  ? 'Custom access rules are active for this manager. Changes made to default manager role permissions or other centres will NOT overwrite or affect this manager.'
                  : 'This manager currently inherits standard Enterprise Default manager permissions. Changes to enterprise defaults will automatically propagate here. Conflict prevention is active.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {!overrideEnabled ? (
              <OwnButton
                variant="outline"
                size="sm"
                onClick={handleToggleOverride}
                icon={<Unlock className="w-3.5 h-3.5 text-primary" />}
                className="border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
              >
                Customize (Enable Override)
              </OwnButton>
            ) : (
              <OwnButton
                variant="outline"
                size="sm"
                onClick={handleToggleOverride}
                loading={resetting}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 cursor-pointer"
              >
                Revert to Enterprise Defaults
              </OwnButton>
            )}
          </div>
        </div>
      </OwnCard>

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
        <div className="space-y-4">
          {!overrideEnabled && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                Permissions are currently locked to Enterprise Defaults. Click <strong>"Customize (Enable Override)"</strong> above to modify specific permissions for this manager.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(macData.modules).map(([moduleKey, mod]) => {
              const modPerms = mod.permissions
              const modGrantedCount = modPerms.filter((p) => permissionStates[p.key]).length

              return (
                <OwnCard
                  key={moduleKey}
                  className={`p-5 flex flex-col justify-between transition ${!overrideEnabled ? 'opacity-85' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{mod.module_display}</h4>
                        <span className="text-[11px] text-muted-foreground">
                          {modGrantedCount} of {modPerms.length} granted
                        </span>
                      </div>

                      {overrideEnabled && (
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
                      )}
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
                                {!overrideEnabled && (
                                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.description}</p>
                            </div>
                            <ToggleSwitch
                              id={`perm-${p.key}`}
                              checked={isChecked}
                              onChange={() => handleToggle(p.key)}
                              disabled={!overrideEnabled}
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
        </div>
      ) : null}

      {/* Bottom Save Bar */}
      {!loading && macData && (
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border flex-wrap">
          <div className="text-xs text-muted-foreground">
            {overrideEnabled
              ? 'Changes saved here are stored as custom overrides for this manager.'
              : 'Manager is synchronized with enterprise defaults. Enable Override above to change permissions.'}
          </div>
          <div className="flex items-center gap-3">
            {overrideEnabled && (
              <OwnButton
                variant="outline"
                size="sm"
                onClick={handleToggleOverride}
                loading={resetting}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
              >
                Revert to Defaults
              </OwnButton>
            )}
            <OwnButton
              onClick={handleSave}
              loading={saving}
              disabled={!overrideEnabled}
              variant="primary"
            >
              Save All Changes
            </OwnButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerAccessControl
