import React, { useState, useEffect } from 'react'
import {
  Clock,
  Shield,
  Building2,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import apiClient from '../services/api'

interface WorkingHoursData {
  employee_id: string
  employee_name: string
  centre_id: string | null
  centre_name: string
  configuration_source: string
  source_badge: string
  shift_timings: {
    office_start: string
    office_end: string
    break_start: string
    break_end: string
  }
  rules: {
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
  verification_methods: {
    normal_punch: boolean
    gps: boolean
    geofencing: boolean
    qr: boolean
    face_recognition: boolean
    biometric: boolean
  }
  days?: Array<{
    id?: string
    day_of_week: number
    day_name: string
    is_enabled: boolean
    start_time: string | null
    end_time: string | null
    break_start: string | null
    break_end: string | null
    is_override?: boolean
    configuration_source?: string
  }>
  effective: Record<string, any>
  source: Record<string, string>
}

interface WorkingHoursOvertimeSectionProps {
  employeeId: string
  otRate?: string | number
  currency?: string
}

export const WorkingHoursOvertimeSection: React.FC<WorkingHoursOvertimeSectionProps> = ({
  employeeId,
  otRate = 0,
  currency = 'INR',
}) => {
  const [data, setData] = useState<WorkingHoursData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchWorkingHours = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiClient.get<WorkingHoursData>(`/employees/${employeeId}/working-hours/`)
        if (isMounted) {
          setData(res.data)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Failed to load working hours and overtime policy.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (employeeId) {
      fetchWorkingHours()
    }

    return () => {
      isMounted = false
    }
  }, [employeeId])

  if (loading) {
    return (
      <div className="p-6 bg-card rounded-2xl border border-border animate-pulse flex items-center justify-center">
        <div className="h-5 w-48 bg-muted rounded"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>{error || 'Working hours policy not available for this employee.'}</span>
      </div>
    )
  }

  const { shift_timings, rules, source_badge, configuration_source, days } = data
  const isEmployeeSpecific = source_badge.toLowerCase().includes('employee')
  const isCentreSpecific = source_badge.toLowerCase().includes('centre')

  // Calculate directly from 7-day schedule records when present, or fallback to rules
  const enabledDays = Array.isArray(days) && days.length > 0 ? days.filter(d => d.is_enabled) : null
  const offDays = Array.isArray(days) && days.length > 0 ? days.filter(d => !d.is_enabled) : null

  const workingDaysPerWeek = enabledDays !== null ? enabledDays.length : (rules?.working_days_per_week ?? 5)
  const weeklyOffDaysList = offDays !== null ? offDays.map(d => d.day_name) : (rules?.weekly_off_days ?? [])

  // Resolve active shift timings (prioritizing active working days)
  const firstEnabled = enabledDays && enabledDays.length > 0 ? enabledDays[0] : null
  const officeStart = (firstEnabled?.start_time) || shift_timings?.office_start || '09:00'
  const officeEnd = (firstEnabled?.end_time) || shift_timings?.office_end || '18:00'
  const breakStart = (firstEnabled?.break_start) || shift_timings?.break_start || '13:00'
  const breakEnd = (firstEnabled?.break_end) || shift_timings?.break_end || '14:00'

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Working Hours & Overtime Policy
            </h4>
            {isEmployeeSpecific ? (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> {source_badge}
              </span>
            ) : isCentreSpecific ? (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {source_badge}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                <Shield className="w-3 h-3" /> {source_badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Scheduled shifts, working schedule, grace window, and overtime rules.
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Policy Source</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{configuration_source}</span>
        </div>
      </div>

      {/* 4-Column Compact Policy Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        {/* Column 1: Shift */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Shift
          </span>
          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {officeStart} — {officeEnd}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Break: {breakStart} — {breakEnd}
          </span>
        </div>

        {/* Column 2: Working Days */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Working Days
          </span>
          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {workingDaysPerWeek} days/week
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate" title={weeklyOffDaysList.join(', ')}>
            Weekly off: {weeklyOffDaysList.length > 0 ? weeklyOffDaysList.join(', ') : 'None'}
          </span>
        </div>

        {/* Column 3: Grace Period */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Grace Period
          </span>
          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {rules.grace_period_minutes} minutes
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Full: {Math.round(rules.minimum_present_minutes / 60)}h • Half: {Math.round(rules.minimum_half_day_minutes / 60)}h
          </span>
        </div>

        {/* Column 4: Overtime */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Overtime
          </span>
          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${rules.ot_enabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            <span>{rules.ot_enabled ? 'Eligible' : 'Disabled'}</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{Number(otRate) > 0 ? `${currency} ${otRate}/hr` : '1.5× Hourly'}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
