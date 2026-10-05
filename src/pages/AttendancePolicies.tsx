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

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 }
]

export const AttendancePolicies: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'policy' | 'methods' | 'schedule'>('policy')
  const [scope, setScope] = useState<'centre' | 'enterprise'>('centre')
  const [selectedCentreId, setSelectedCentreId] = useState<string>('')

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
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800">
          Enterprise Default
        </span>
      )
    }

    const src = policyData?.source?.[fieldKey]
    const isOverridden = src === 'center' || src === 'center_branch_record'

    return (
      <div className="flex items-center gap-2">
        {isOverridden ? (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Centre Override
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Enterprise Default
          </span>
        )}

        {isOverridden && scope === 'centre' && (
          <button
            type="button"
            onClick={() => handleReset(fieldKey)}
            disabled={resetting === fieldKey}
            className="text-[11px] text-slate-400 hover:text-white underline transition-colors disabled:opacity-50"
            title="Reset this specific field to Enterprise Default"
          >
            {resetting === fieldKey ? 'Resetting...' : 'Reset'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Page Title & Scope Toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-indigo-400" />
            Attendance Policy & Verification Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Field-level inheritance model: Centre Override → Enterprise Default → System Default.
          </p>
        </div>

        {/* Scope Pill Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setScope('centre')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              scope === 'centre'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Centre Level
          </button>
          <button
            onClick={() => setScope('enterprise')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              scope === 'enterprise'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Enterprise Defaults
          </button>
        </div>
      </div>

      {/* Centre Selector & Reset All Bar (when Centre Scope is active) */}
      {scope === 'centre' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800 rounded-lg transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting === 'all' ? 'animate-spin' : ''}`} />
              Reset All to Enterprise Default
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('policy')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'policy'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance & Shift Rules
        </button>

        <button
          onClick={() => setActiveTab('methods')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'methods'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          Verification Methods & GPS
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'schedule'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Weekly Schedule & Offs
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Form Content */}
      {loading ? (
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-slate-500">
          Loading policy configuration...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Attendance Rules */}
        {activeTab === 'policy' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shift Times */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Default Shift Boundaries
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Office Start Time</label>
                    {renderProvenanceBadge('office_start')}
                  </div>
                  <input
                    type="time"
                    value={form.office_start}
                    onChange={(e) => setForm({ ...form, office_start: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Office End Time</label>
                    {renderProvenanceBadge('office_end')}
                  </div>
                  <input
                    type="time"
                    value={form.office_end}
                    onChange={(e) => setForm({ ...form, office_end: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Break Start</label>
                      {renderProvenanceBadge('break_start')}
                    </div>
                    <input
                      type="time"
                      value={form.break_start}
                      onChange={(e) => setForm({ ...form, break_start: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Break End</label>
                      {renderProvenanceBadge('break_end')}
                    </div>
                    <input
                      type="time"
                      value={form.break_end}
                      onChange={(e) => setForm({ ...form, break_end: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Grace & Thresholds */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Grace Periods & Calculations
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Grace Period (Minutes)</label>
                    {renderProvenanceBadge('grace_period_minutes')}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={form.grace_period_minutes}
                    onChange={(e) => setForm({ ...form, grace_period_minutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Arrivals within this period will not be marked late.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Min Present (Min)</label>
                      {renderProvenanceBadge('minimum_present_minutes')}
                    </div>
                    <input
                      type="number"
                      value={form.minimum_present_minutes}
                      onChange={(e) => setForm({ ...form, minimum_present_minutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Min Half-Day (Min)</label>
                      {renderProvenanceBadge('minimum_half_day_minutes')}
                    </div>
                    <input
                      type="number"
                      value={form.minimum_half_day_minutes}
                      onChange={(e) => setForm({ ...form, minimum_half_day_minutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Late Threshold (Min)</label>
                      {renderProvenanceBadge('late_threshold_minutes')}
                    </div>
                    <input
                      type="number"
                      value={form.late_threshold_minutes}
                      onChange={(e) => setForm({ ...form, late_threshold_minutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Early Out Threshold (Min)</label>
                      {renderProvenanceBadge('early_checkout_threshold_minutes')}
                    </div>
                    <input
                      type="number"
                      value={form.early_checkout_threshold_minutes}
                      onChange={(e) => setForm({ ...form, early_checkout_threshold_minutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Overtime Policy */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 md:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Overtime Calculations & Approvals
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ot_enabled"
                    checked={form.ot_enabled}
                    onChange={(e) => setForm({ ...form, ot_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <label htmlFor="ot_enabled" className="text-sm font-semibold text-slate-200 cursor-pointer">
                      Enable Overtime
                    </label>
                    <p className="text-[11px] text-slate-400">Track OT hours after full shift</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">OT Grace (Minutes)</label>
                    {renderProvenanceBadge('ot_grace_minutes')}
                  </div>
                  <input
                    type="number"
                    disabled={!form.ot_enabled}
                    value={form.ot_grace_minutes}
                    onChange={(e) => setForm({ ...form, ot_grace_minutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Max Daily OT (Min)</label>
                    {renderProvenanceBadge('max_daily_ot_minutes')}
                  </div>
                  <input
                    type="number"
                    disabled={!form.ot_enabled}
                    value={form.max_daily_ot_minutes}
                    onChange={(e) => setForm({ ...form, max_daily_ot_minutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Verification Methods & Location */}
        {activeTab === 'methods' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-blue-400" />
                  Independent Attendance Methods
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Each Centre can independently enable or disable verification modalities without affecting others.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {/* Normal Punch */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="allow_normal_punch"
                    checked={form.allow_normal_punch}
                    onChange={(e) => setForm({ ...form, allow_normal_punch: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <label htmlFor="allow_normal_punch" className="text-sm font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      Normal Punch
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Web & Mobile manual one-click check in/out.</p>
                  </div>
                </div>

                {/* Face Recognition */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="allow_face_recognition"
                    checked={form.allow_face_recognition}
                    onChange={(e) => setForm({ ...form, allow_face_recognition: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <label htmlFor="allow_face_recognition" className="text-sm font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5">
                      <ScanFace className="w-4 h-4 text-purple-400" />
                      Face Recognition
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Biometric facial verification on arrival.</p>
                  </div>
                </div>

                {/* GPS / Geofence */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="allow_gps"
                    checked={form.allow_gps}
                    onChange={(e) => setForm({ ...form, allow_gps: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <label htmlFor="allow_gps" className="text-sm font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      GPS / Location
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Requires device GPS within geofenced radius.</p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="allow_qr"
                    checked={form.allow_qr}
                    onChange={(e) => setForm({ ...form, allow_qr: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <label htmlFor="allow_qr" className="text-sm font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      QR Code Scan
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Scan rotating kiosk or office QR code.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* GPS & Geofence Configuration */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    Centre Geofencing & Coordinates
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Latitude and longitude bounds for attendance verification.
                  </p>
                </div>
                {renderProvenanceBadge('gps_latitude')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 19.0760"
                    value={form.gps_latitude}
                    onChange={(e) => setForm({ ...form, gps_latitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 72.8777"
                    value={form.gps_longitude}
                    onChange={(e) => setForm({ ...form, gps_longitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Allowed Radius (Metres)</label>
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    placeholder="100"
                    value={form.gps_radius_meters}
                    onChange={(e) => setForm({ ...form, gps_radius_meters: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.location_required_checkin}
                    onChange={(e) => setForm({ ...form, location_required_checkin: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">Mandate GPS Verification for Check-In</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.location_required_checkout}
                    onChange={(e) => setForm({ ...form, location_required_checkout: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">Mandate GPS Verification for Check-Out</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Weekly Offs & Schedule */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Weekly Off Days (0 to 7 days supported) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-amber-400" />
                    Weekly Off Configuration
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select 0 to 7 days. All combinations are completely valid (0 days off, 1 day off, 2 days off, 7 days off).
                  </p>
                </div>
                {renderProvenanceBadge('weekly_off_days')}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
                {DAYS_OF_WEEK.map((d) => {
                  const isChecked = (form.weekly_off_days || []).includes(d.value)
                  return (
                    <label
                      key={d.value}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-950/40 border-amber-600 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWeeklyOff(d.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-bold">{d.label}</span>
                      <span className="text-[11px] mt-1">
                        {isChecked ? 'Weekly Off' : 'Working Day'}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="text-xs text-slate-400 pt-2 flex items-center gap-2">
                <span>Selected:</span>
                <span className="font-semibold text-slate-200">
                  {form.weekly_off_days?.length === 0
                    ? '0 Weekly Offs (Continuous operations)'
                    : `${form.weekly_off_days?.length} day(s) off per week`}
                </span>
              </div>
            </div>

            {/* Per-Day Custom Schedule */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Day-of-Week Working Schedule
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Specify different working hours on different days (e.g. half-day Saturdays). Empty fields inherit default shift.
                </p>
              </div>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map((d) => {
                  const isOff = (form.weekly_off_days || []).includes(d.value)
                  const daySched = form.daily_schedules?.[String(d.value)] || {}

                  return (
                    <div
                      key={d.value}
                      className={`grid grid-cols-1 sm:grid-cols-4 items-center gap-3 p-3 rounded-xl border ${
                        isOff
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="font-medium text-sm text-slate-200 flex items-center gap-2">
                        <span>{d.label}</span>
                        {isOff && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 disabled:opacity-40"
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 disabled:opacity-40"
                        />
                      </div>

                      <div className="text-right">
                        {daySched.start && daySched.end ? (
                          <span className="text-xs text-blue-400 font-medium">Custom Shift</span>
                        ) : (
                          <span className="text-xs text-slate-500">Default ({form.office_start} - {form.office_end})</span>
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-900/40 transition-all disabled:opacity-60"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : scope === 'enterprise' ? 'Save Enterprise Defaults' : 'Save Centre Overrides'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}

export default AttendancePolicies
