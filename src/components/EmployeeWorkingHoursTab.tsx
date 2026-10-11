import React, { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Building2,
  UserCheck,
  Edit2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Coffee,
  X,
  Info,
  SlidersHorizontal,
  Save,
  Loader2
} from 'lucide-react'
import apiClient from '../services/api'

export interface EmployeeDayWorkingHour {
  id?: string
  day_of_week: number
  day_name: string
  is_enabled: boolean
  start_time: string | null
  end_time: string | null
  break_start: string | null
  break_end: string | null
  is_override: boolean
  configuration_source: string
}

export interface WorkingHoursScheduleData {
  employee_id: string
  employee_name: string
  centre_id: string | null
  centre_name: string
  is_override: boolean
  configuration_source: string
  source_badge: string
  can_edit: boolean
  days: EmployeeDayWorkingHour[]
  shift_timings?: {
    office_start: string
    office_end: string
    break_start: string
    break_end: string
  }
  rules?: {
    grace_period_minutes: number
    minimum_present_minutes: number
    minimum_half_day_minutes: number
    late_threshold_minutes: number
    early_checkout_threshold_minutes: number
    working_days_per_week: number
    weekly_off_days: string[]
    ot_enabled: boolean
    ot_grace_minutes: number
    max_daily_ot_minutes: number
  }
}

interface EmployeeWorkingHoursTabProps {
  employeeId: string
  employeeName?: string
  branchName?: string
  onScheduleUpdated?: () => void
}

const DEFAULT_DAYS = [
  { day_of_week: 0, day_name: 'Monday', is_enabled: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', is_override: false, configuration_source: 'CENTRE' },
  { day_of_week: 1, day_name: 'Tuesday', is_enabled: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', is_override: false, configuration_source: 'CENTRE' },
  { day_of_week: 2, day_name: 'Wednesday', is_enabled: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', is_override: false, configuration_source: 'CENTRE' },
  { day_of_week: 3, day_name: 'Thursday', is_enabled: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', is_override: false, configuration_source: 'CENTRE' },
  { day_of_week: 4, day_name: 'Friday', is_enabled: true, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', is_override: false, configuration_source: 'CENTRE' },
  { day_of_week: 5, day_name: 'Saturday', is_enabled: false, start_time: null, end_time: null, break_start: null, break_end: null, is_override: false, configuration_source: 'CENTRE' },
  { day_of_week: 6, day_name: 'Sunday', is_enabled: false, start_time: null, end_time: null, break_start: null, break_end: null, is_override: false, configuration_source: 'CENTRE' },
]

export const EmployeeWorkingHoursTab: React.FC<EmployeeWorkingHoursTabProps> = ({
  employeeId,
  employeeName,
  branchName,
  onScheduleUpdated,
}) => {
  const [data, setData] = useState<WorkingHoursScheduleData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [editDays, setEditDays] = useState<EmployeeDayWorkingHour[]>([])
  const [saving, setSaving] = useState<boolean>(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Reset Confirmation State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false)
  const [resetting, setResetting] = useState<boolean>(false)

  const fetchSchedule = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<WorkingHoursScheduleData>(`/employees/${employeeId}/working-hours/`)
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee working hours schedule.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!data) return
    // Deep clone current days
    const currentDays = (data.days && data.days.length === 7) ? data.days : DEFAULT_DAYS
    const cloned = currentDays.map((d) => ({
      ...d,
      start_time: d.start_time || '09:00',
      end_time: d.end_time || '18:00',
      break_start: d.break_start || '13:00',
      break_end: d.break_end || '14:00',
    }))
    setEditDays(cloned)
    setValidationError(null)
    setIsEditModalOpen(true)
  }

  // Handle Day Field Change
  const handleDayFieldChange = (
    index: number,
    field: keyof EmployeeDayWorkingHour,
    value: any
  ) => {
    setEditDays((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    setValidationError(null)
  }

  // Validate Schedule
  const validateForm = (): boolean => {
    for (const d of editDays) {
      if (d.is_enabled) {
        if (!d.start_time || !d.end_time) {
          setValidationError(`${d.day_name}: Shift start and end times are required for working days.`)
          return false
        }
        if (d.end_time <= d.start_time) {
          setValidationError(`${d.day_name}: Shift end time (${d.end_time}) must be later than start time (${d.start_time}).`)
          return false
        }
        if ((d.break_start && !d.break_end) || (!d.break_start && d.break_end)) {
          setValidationError(`${d.day_name}: Both break start and break end times must be specified.`)
          return false
        }
        if (d.break_start && d.break_end) {
          if (d.break_end <= d.break_start) {
            setValidationError(`${d.day_name}: Break end time must be later than break start time.`)
            return false
          }
          if (d.break_start < d.start_time || d.break_end > d.end_time) {
            setValidationError(`${d.day_name}: Break interval must be within shift hours (${d.start_time}–${d.end_time}).`)
            return false
          }
        }
      }
    }
    return true
  }

  // Save Schedule Changes
  const handleSaveSchedule = async () => {
    if (!validateForm()) return
    setSaving(true)
    setValidationError(null)
    try {
      const payload = {
        days: editDays.map((d) => ({
          day_of_week: d.day_of_week,
          is_enabled: d.is_enabled,
          start_time: d.is_enabled ? d.start_time : null,
          end_time: d.is_enabled ? d.end_time : null,
          break_start: d.is_enabled && d.break_start ? d.break_start : null,
          break_end: d.is_enabled && d.break_end ? d.break_end : null,
        })),
        is_override: true,
      }
      const res = await apiClient.put<WorkingHoursScheduleData>(`/employees/${employeeId}/working-hours/`, payload)
      setData(res.data)
      setIsEditModalOpen(false)
      setSuccessMsg('Employee working hours schedule updated successfully.')
      onScheduleUpdated?.()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save working hours schedule.'
      setValidationError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSaving(false)
    }
  }

  // Reset to Centre Policy
  const handleResetToCentre = async () => {
    setResetting(true)
    try {
      const res = await apiClient.post<WorkingHoursScheduleData>(`/employees/${employeeId}/working-hours/reset/`)
      setData(res.data)
      setIsResetConfirmOpen(false)
      setIsEditModalOpen(false)
      setSuccessMsg('Working hours restored to Centre Policy defaults.')
      onScheduleUpdated?.()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset schedule to centre defaults.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-card rounded-2xl border border-border flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Loading employee weekly schedule...</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
        <button
          onClick={fetchSchedule}
          className="px-3.5 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  const daysList = (data?.days && data.days.length === 7) ? data.days : DEFAULT_DAYS
  const isOverridden = Boolean(data?.is_override)
  const centreTitle = data?.centre_name || branchName || 'Assigned Centre'

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Provenance Control Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Weekly Working Hours
            </h3>

            {isOverridden ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1.5">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                Employee Override Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-600" />
                Inherited from Centre
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Centre Policy: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{centreTitle}</strong>
            {' • '}
            Source: <span className="text-slate-600 dark:text-slate-300">{data?.configuration_source || 'Centre Policy'}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {isOverridden && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Restore centre policy defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Restore Centre Policy
            </button>
          )}

          <button
            onClick={handleOpenEdit}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isOverridden ? 'Edit Schedule' : 'Customize Schedule'}
          </button>
        </div>
      </div>

      {/* 7-Day Clean Weekly Schedule Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Shift Timings</th>
                <th className="py-3 px-4">Break Interval</th>
                <th className="py-3 px-4 text-right">Configuration Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {daysList.map((day) => {
                const isWorking = day.is_enabled
                return (
                  <tr
                    key={day.day_of_week}
                    className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                      !isWorking ? 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {/* Day Column */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Calendar className={`w-3.5 h-3.5 ${isWorking ? 'text-primary' : 'text-slate-400'}`} />
                      <span>{day.day_name}</span>
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-4">
                      {isWorking ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Working
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Day Off
                        </span>
                      )}
                    </td>

                    {/* Shift Timings Column */}
                    <td className="py-3 px-4">
                      {isWorking && day.start_time && day.end_time ? (
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {day.start_time} – {day.end_time}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Break Interval Column */}
                    <td className="py-3 px-4">
                      {isWorking && day.break_start && day.break_end ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          <Coffee className="w-3 h-3 text-amber-500" />
                          {day.break_start} – {day.break_end}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Source Column */}
                    <td className="py-3 px-4 text-right">
                      {day.is_override ? (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Custom
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Inherited
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Rules Footer Ribbon */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 dark:text-slate-400">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Grace Period</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {data?.rules?.grace_period_minutes ?? 15} minutes
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Minimum Present</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {Math.round((data?.rules?.minimum_present_minutes ?? 480) / 60)} hrs
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Minimum Half-Day</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {Math.round((data?.rules?.minimum_half_day_minutes ?? 240) / 60)} hrs
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Overtime Eligibility</span>
            <span className={`font-semibold ${data?.rules?.ot_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600'}`}>
              {data?.rules?.ot_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* EDIT SCHEDULE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  Edit Weekly Working Hours
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Customize shift timings and enabled working days for {employeeName || 'this employee'}.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Informational banner */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-semibold">Disabled days are scheduled days off.</span> No attendance punches will be expected, and employees will not be marked absent on disabled days.
                </div>
              </div>

              {/* Validation error message */}
              {validationError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{validationError}</span>
                </div>
              )}

              {/* 7 Days Editor List */}
              <div className="space-y-3">
                {editDays.map((day, idx) => (
                  <div
                    key={day.day_of_week}
                    className={`p-3.5 rounded-xl border transition-all ${
                      day.is_enabled
                        ? 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-2xs'
                        : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Day and Enable Toggle */}
                      <div className="flex items-center justify-between sm:justify-start gap-3 min-w-[150px]">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {day.day_name}
                        </span>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={day.is_enabled}
                            onChange={(e) => handleDayFieldChange(idx, 'is_enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {/* Shift & Break Timings Inputs */}
                      {day.is_enabled ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs flex-1">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={day.start_time || '09:00'}
                              onChange={(e) => handleDayFieldChange(idx, 'start_time', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={day.end_time || '18:00'}
                              onChange={(e) => handleDayFieldChange(idx, 'end_time', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                              Break Start
                            </label>
                            <input
                              type="time"
                              value={day.break_start || ''}
                              onChange={(e) => handleDayFieldChange(idx, 'break_start', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary"
                              placeholder="13:00"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                              Break End
                            </label>
                            <input
                              type="time"
                              value={day.break_end || ''}
                              onChange={(e) => handleDayFieldChange(idx, 'break_end', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary"
                              placeholder="14:00"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-xs text-slate-400 dark:text-slate-500 italic py-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                          Day Off — No attendance punches expected
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Centre Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Restore Centre Policy?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will remove the employee-specific schedule overrides and restore the effective policy from{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{centreTitle}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToCentre}
                disabled={resetting}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Yes, Restore Policy'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
