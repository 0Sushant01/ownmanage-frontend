import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldAlert,
  Save,
  RotateCcw,
  AlertTriangle,
  Clock,
  MapPin,
  QrCode,
  ScanFace,
  Fingerprint,
  Calendar,
  Layers,
  Building2,
  CalendarDays,
  Smartphone
} from '../components/Icons'
import apiClient from '../services/api'
import { CentreSelector } from '../components/CentreSelector'
import { ToggleSwitch } from '../components/ToggleSwitch'

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 }
]

export interface AttendancePoliciesProps {
  initialCentreId?: string
  isEmbedded?: boolean
  onClose?: () => void
}

export const AttendancePolicies: React.FC<AttendancePoliciesProps> = ({
  initialCentreId,
  isEmbedded = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'methods' | 'schedule'>('policy')
  const [scope, setScope] = useState<'centre' | 'enterprise'>('centre')
  const [selectedCentreId, setSelectedCentreId] = useState<string>(initialCentreId || '')

  useEffect(() => {
    if (initialCentreId && initialCentreId !== 'all') {
      setSelectedCentreId(initialCentreId)
      setScope('centre')
    }
  }, [initialCentreId])

  const [policyData, setPolicyData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form values
  const [form, setForm] = useState<any>({
    office_start: '09:00',
    office_end: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    grace_period_minutes: 15,
    minimum_present_minutes: 480,
    minimum_half_day_minutes: 240,
    late_threshold_minutes: 30,
    early_checkout_threshold_minutes: 30,
    weekly_off_days: [6], // Sunday default
    auto_attendance: true,
    ot_enabled: false,
    ot_grace_minutes: 30,
    max_daily_ot_minutes: 240,
    ot_approval_required: true,
    // Verification methods
    allow_normal_punch: true,
    allow_gps: true,
    allow_geofencing: false,
    allow_qr: false,
    allow_face_recognition: false,
    allow_biometric: false,
    // GPS
    gps_latitude: '',
    gps_longitude: '',
    gps_radius_meters: 100,
    location_required_checkin: false,
    location_required_checkout: false,
    // Daily schedule overrides
    daily_schedules: {}
  })

  // Load effective policy
  const loadPolicy = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      let res
      if (scope === 'enterprise') {
        res = await apiClient.get('/attendance/policies/enterprise/')
      } else if (selectedCentreId && selectedCentreId !== 'all') {
        res = await apiClient.get(`/centres/${selectedCentreId}/attendance-policy/`)
      } else {
        // Fallback to enterprise
        res = await apiClient.get('/attendance/policies/enterprise/')
      }

      setPolicyData(res.data)
      const eff = res.data.effective || {}

      // Normalize weekly_off_days
      let offDays = eff.weekly_off_days
      if (!Array.isArray(offDays)) {
        offDays = eff.weekly_off !== undefined ? [eff.weekly_off] : [6]
      }

      setForm({
        office_start: eff.office_start || '09:00',
        office_end: eff.office_end || '18:00',
        break_start: eff.break_start || '13:00',
        break_end: eff.break_end || '14:00',
        grace_period_minutes: eff.grace_period_minutes ?? 15,
        minimum_present_minutes: eff.minimum_present_minutes ?? 480,
        minimum_half_day_minutes: eff.minimum_half_day_minutes ?? 240,
        late_threshold_minutes: eff.late_threshold_minutes ?? 30,
        early_checkout_threshold_minutes: eff.early_checkout_threshold_minutes ?? 30,
        weekly_off_days: offDays,
        auto_attendance: eff.auto_attendance ?? true,
        ot_enabled: eff.ot_enabled ?? false,
        ot_grace_minutes: eff.ot_grace_minutes ?? 30,
        max_daily_ot_minutes: eff.max_daily_ot_minutes ?? 240,
        ot_approval_required: eff.ot_approval_required ?? true,
        // Methods
        allow_normal_punch: eff.allow_normal_punch ?? true,
        allow_gps: eff.allow_gps ?? true,
        allow_geofencing: eff.allow_geofencing ?? false,
        allow_qr: eff.allow_qr ?? false,
        allow_face_recognition: eff.allow_face_recognition ?? false,
        allow_biometric: eff.allow_biometric ?? false,
        // GPS
        gps_latitude: eff.gps_latitude !== null && eff.gps_latitude !== undefined ? eff.gps_latitude : '',
        gps_longitude: eff.gps_longitude !== null && eff.gps_longitude !== undefined ? eff.gps_longitude : '',
        gps_radius_meters: eff.gps_radius_meters ?? 100,
        location_required_checkin: eff.location_required_checkin ?? false,
        location_required_checkout: eff.location_required_checkout ?? false,
        daily_schedules: eff.daily_schedules || {}
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load policy configuration.')
    } finally {
      setLoading(false)
    }
  }, [scope, selectedCentreId])

  useEffect(() => {
    loadPolicy()
  }, [loadPolicy])

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    const payload: any = {
      ...form,
      gps_latitude: form.gps_latitude !== '' ? parseFloat(form.gps_latitude) : null,
      gps_longitude: form.gps_longitude !== '' ? parseFloat(form.gps_longitude) : null,
      gps_radius_meters: parseInt(form.gps_radius_meters, 10) || 100
    }

    try {
      if (scope === 'enterprise') {
        const res = await apiClient.put('/attendance/policies/enterprise/', payload)
        setPolicyData(res.data)
        setSuccessMsg('Enterprise attendance defaults updated successfully.')
      } else {
        const res = await apiClient.put(`/centres/${selectedCentreId}/attendance-policy/`, payload)
        setPolicyData(res.data)
        setSuccessMsg(`Centre overrides saved for ${res.data.centre_name || 'selected centre'}.`)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration.')
    } finally {
      setSaving(false)
    }
  }

  // Reset to Enterprise Default (all or single field)
  const handleReset = async (field?: string) => {
    if (!selectedCentreId || selectedCentreId === 'all') return
    const confirmText = field
      ? `Reset ${field} to Enterprise Default?`
      : 'Reset all Centre overrides to Enterprise Defaults?'
    if (!window.confirm(confirmText)) return

    setResetting(field || 'all')
    setError(null)
    setSuccessMsg(null)

    try {
      const payload = field ? { field } : {}
      const res = await apiClient.post(`/centres/${selectedCentreId}/attendance-policy/reset/`, payload)
      setPolicyData(res.data)
      setSuccessMsg(res.data.detail || 'Reset to Enterprise Default successful.')
      loadPolicy()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset override.')
    } finally {
      setResetting(null)
    }
  }

  const toggleWeeklyOff = (dayIdx: number) => {
    const current: number[] = form.weekly_off_days || []
    if (current.includes(dayIdx)) {
      setForm({ ...form, weekly_off_days: current.filter((d) => d !== dayIdx) })
    } else {
      setForm({ ...form, weekly_off_days: [...current, dayIdx].sort((a, b) => a - b) })
    }
  }

  const renderProvenanceBadge = (fieldKey: string) => {
    if (scope === 'enterprise') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          Enterprise Default
        </span>
      )
    }

    const src = policyData?.source?.[fieldKey]
    const isOverridden = src === 'center' || src === 'center_branch_record'

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {isOverridden ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Centre Override
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Enterprise Default
          </span>
        )}

        {isOverridden && scope === 'centre' && (
          <button
            type="button"
            onClick={() => handleReset(fieldKey)}
            disabled={resetting === fieldKey}
            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline transition-colors disabled:opacity-50 cursor-pointer"
            title="Reset this specific field to Enterprise Default"
          >
            {resetting === fieldKey ? 'Resetting...' : 'Reset'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={isEmbedded ? "space-y-6" : "p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6"}>
      {/* Page Title & Scope Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Attendance Policy & Verification Engine</span>
            </h1>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-border"
              >
                Back to Register
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Field-level inheritance model: Centre Override → Enterprise Default → System Default.
          </p>
        </div>

        {/* Scope Pill Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1 self-start sm:self-auto">
          <button
            onClick={() => setScope('centre')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              scope === 'centre'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Centre Level
          </button>
          <button
            onClick={() => setScope('enterprise')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              scope === 'enterprise'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Enterprise Defaults
          </button>
        </div>
      </div>

      {/* Centre Selector & Reset All Bar (when Centre Scope is active) */}
      {scope === 'centre' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CentreSelector
              value={selectedCentreId}
              onChange={(val) => setSelectedCentreId(val)}
              showAllOption={false}
              label="Configuring Centre:"
            />
          </div>

          {policyData?.has_override && (
            <button
              onClick={() => handleReset()}
              disabled={resetting === 'all'}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting === 'all' ? 'animate-spin' : ''}`} />
              Reset All to Enterprise Default
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-4 sm:space-x-6 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('policy')}
          className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'policy'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance & Shift Rules
        </button>

        <button
          onClick={() => setActiveTab('methods')}
          className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'methods'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          Verification Methods & GPS
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'schedule'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Weekly Schedule & Offs
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 dark:hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Form Content */}
      {loading ? (
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-slate-400 text-sm">
          Loading policy configuration...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: Attendance Rules */}
          {activeTab === 'policy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Shift Times */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  Default Shift Boundaries
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Office Start Time</label>
                      {renderProvenanceBadge('office_start')}
                    </div>
                    <input
                      type="time"
                      value={form.office_start}
                      onChange={(e) => setForm({ ...form, office_start: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Office End Time</label>
                      {renderProvenanceBadge('office_end')}
                    </div>
                    <input
                      type="time"
                      value={form.office_end}
                      onChange={(e) => setForm({ ...form, office_end: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Break Start</label>
                        {renderProvenanceBadge('break_start')}
                      </div>
                      <input
                        type="time"
                        value={form.break_start}
                        onChange={(e) => setForm({ ...form, break_start: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Break End</label>
                        {renderProvenanceBadge('break_end')}
                      </div>
                      <input
                        type="time"
                        value={form.break_end}
                        onChange={(e) => setForm({ ...form, break_end: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grace & Thresholds */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  Grace Periods & Calculations
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Grace Period (Minutes)</label>
                      {renderProvenanceBadge('grace_period_minutes')}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={form.grace_period_minutes}
                      onChange={(e) => setForm({ ...form, grace_period_minutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Arrivals within this window will not be penalized as late.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Min Present (Min)</label>
                        {renderProvenanceBadge('minimum_present_minutes')}
                      </div>
                      <input
                        type="number"
                        value={form.minimum_present_minutes}
                        onChange={(e) => setForm({ ...form, minimum_present_minutes: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Min Half-Day (Min)</label>
                        {renderProvenanceBadge('minimum_half_day_minutes')}
                      </div>
                      <input
                        type="number"
                        value={form.minimum_half_day_minutes}
                        onChange={(e) => setForm({ ...form, minimum_half_day_minutes: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Late Threshold (Min)</label>
                        {renderProvenanceBadge('late_threshold_minutes')}
                      </div>
                      <input
                        type="number"
                        value={form.late_threshold_minutes}
                        onChange={(e) => setForm({ ...form, late_threshold_minutes: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Early Out Threshold (Min)</label>
                        {renderProvenanceBadge('early_checkout_threshold_minutes')}
                      </div>
                      <input
                        type="number"
                        value={form.early_checkout_threshold_minutes}
                        onChange={(e) => setForm({ ...form, early_checkout_threshold_minutes: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Overtime Policy */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 md:col-span-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Overtime Calculations & Approvals
                  </h3>
                  {renderProvenanceBadge('ot_enabled')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <ToggleSwitch
                      id="ot_enabled"
                      checked={form.ot_enabled}
                      onChange={(val) => setForm({ ...form, ot_enabled: val })}
                      label="Enable Overtime Tracking"
                      description="Track overtime hours accrued after full shift"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">OT Grace (Minutes)</label>
                      {renderProvenanceBadge('ot_grace_minutes')}
                    </div>
                    <input
                      type="number"
                      disabled={!form.ot_enabled}
                      value={form.ot_grace_minutes}
                      onChange={(e) => setForm({ ...form, ot_grace_minutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Max Daily OT (Min)</label>
                      {renderProvenanceBadge('max_daily_ot_minutes')}
                    </div>
                    <input
                      type="number"
                      disabled={!form.ot_enabled}
                      value={form.max_daily_ot_minutes}
                      onChange={(e) => setForm({ ...form, max_daily_ot_minutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Verification Methods & Location */}
          {activeTab === 'methods' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    Independent Attendance Methods
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Each Centre can independently toggle verification modalities without affecting other branches.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                  {/* Normal Punch */}
                  <div className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    form.allow_normal_punch
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <ToggleSwitch
                        id="allow_normal_punch"
                        checked={form.allow_normal_punch}
                        onChange={(val) => setForm({ ...form, allow_normal_punch: val })}
                        size="sm"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Normal Punch</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Web & Mobile manual one-click check in/out.
                      </p>
                    </div>
                  </div>

                  {/* Face Recognition */}
                  <div className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    form.allow_face_recognition
                      ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800/80 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <ScanFace className="w-5 h-5" />
                      </div>
                      <ToggleSwitch
                        id="allow_face_recognition"
                        checked={form.allow_face_recognition}
                        onChange={(val) => setForm({ ...form, allow_face_recognition: val })}
                        size="sm"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Face Recognition</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Biometric facial verification on arrival kiosk.
                      </p>
                    </div>
                  </div>

                  {/* GPS / Geofence */}
                  <div className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    form.allow_gps
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <ToggleSwitch
                        id="allow_gps"
                        checked={form.allow_gps}
                        onChange={(val) => setForm({ ...form, allow_gps: val })}
                        size="sm"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">GPS / Location</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Requires device GPS within geofenced radius.
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    form.allow_qr
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <ToggleSwitch
                        id="allow_qr"
                        checked={form.allow_qr}
                        onChange={(val) => setForm({ ...form, allow_qr: val })}
                        size="sm"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">QR Code Scan</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Scan rotating dynamic kiosk or office QR code.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS & Geofence Configuration */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Centre Geofencing & Coordinates
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Latitude and longitude coordinates for strict physical perimeter verification.
                    </p>
                  </div>
                  {renderProvenanceBadge('gps_latitude')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 19.0760"
                      value={form.gps_latitude}
                      onChange={(e) => setForm({ ...form, gps_latitude: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 72.8777"
                      value={form.gps_longitude}
                      onChange={(e) => setForm({ ...form, gps_longitude: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Allowed Radius (Metres)</label>
                    <input
                      type="number"
                      min="10"
                      max="50000"
                      placeholder="100"
                      value={form.gps_radius_meters}
                      onChange={(e) => setForm({ ...form, gps_radius_meters: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <ToggleSwitch
                      id="loc_checkin"
                      checked={form.location_required_checkin}
                      onChange={(val) => setForm({ ...form, location_required_checkin: val })}
                      label="Mandate GPS Check-In"
                      description="Device must be within designated geofenced radius on arrival"
                      size="sm"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <ToggleSwitch
                      id="loc_checkout"
                      checked={form.location_required_checkout}
                      onChange={(val) => setForm({ ...form, location_required_checkout: val })}
                      label="Mandate GPS Check-Out"
                      description="Device must be within designated geofenced radius on departure"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Weekly Offs & Schedule */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Weekly Off Days (0 to 7 days supported) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
                      Weekly Off Configuration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Select 0 to 7 days. All combinations are completely supported (0 to 7 days off per week).
                    </p>
                  </div>
                  {renderProvenanceBadge('weekly_off_days')}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 sm:gap-3 pt-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const isChecked = (form.weekly_off_days || []).includes(d.value)
                    return (
                      <button
                        type="button"
                        key={d.value}
                        onClick={() => toggleWeeklyOff(d.value)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-sm font-bold">{d.label}</span>
                        <span className={`text-[11px] mt-1 font-medium ${isChecked ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>
                          {isChecked ? 'Weekly Off' : 'Working Day'}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 flex items-center gap-2">
                  <span>Selected:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {form.weekly_off_days?.length === 0
                      ? '0 Weekly Offs (Continuous operations)'
                      : `${form.weekly_off_days?.length} day(s) off per week`}
                  </span>
                </div>
              </div>

              {/* Per-Day Custom Schedule */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    Day-of-Week Working Schedule
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Specify custom working hours on specific days (e.g. half-day Saturdays). Empty fields inherit the default shift.
                  </p>
                </div>

                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((d) => {
                    const isOff = (form.weekly_off_days || []).includes(d.value)
                    const daySched = form.daily_schedules?.[String(d.value)] || {}

                    return (
                      <div
                        key={d.value}
                        className={`grid grid-cols-1 sm:grid-cols-4 items-center gap-3 p-3 rounded-xl border transition-colors ${
                          isOff
                            ? 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{d.label}</span>
                          {isOff && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                              Weekly Off
                            </span>
                          )}
                        </div>

                        <div>
                          <input
                            type="time"
                            disabled={isOff}
                            placeholder={form.office_start}
                            value={daySched.start || ''}
                            onChange={(e) => {
                              const updated = { ...form.daily_schedules }
                              updated[String(d.value)] = {
                                ...(updated[String(d.value)] || {}),
                                start: e.target.value
                              }
                              setForm({ ...form, daily_schedules: updated })
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <input
                            type="time"
                            disabled={isOff}
                            placeholder={form.office_end}
                            value={daySched.end || ''}
                            onChange={(e) => {
                              const updated = { ...form.daily_schedules }
                              updated[String(d.value)] = {
                                ...(updated[String(d.value)] || {}),
                                end: e.target.value
                              }
                              setForm({ ...form, daily_schedules: updated })
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="text-left sm:text-right">
                          {daySched.start && daySched.end ? (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Custom Shift</span>
                          ) : (
                            <span className="text-xs text-slate-500">Default ({form.office_start} – {form.office_end})</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-60 cursor-pointer"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'Saving...' : scope === 'enterprise' ? 'Save Enterprise Defaults' : 'Save Centre Overrides'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AttendancePolicies
