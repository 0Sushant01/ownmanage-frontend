import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Shield,
  Building2,
  UserCheck,
  RotateCcw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Check,
  CalendarDays,
  Sun
} from 'lucide-react'
import apiClient from '../services/api'
import type {
  PayrollScheduleResolution,
  GenerationType,
} from '../types'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnDialog, OwnDialogFooter } from '../design-system/components/OwnDialog'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { ToggleSwitch } from './ToggleSwitch'

interface PayrollScheduleSectionProps {
  employeeId: string
  employeeName: string
  canManage: boolean
  scheduleResolution?: PayrollScheduleResolution | null
  onScheduleUpdated?: (res: PayrollScheduleResolution) => void
  onUpdated?: () => void
}

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

export const PayrollScheduleSection: React.FC<PayrollScheduleSectionProps> = ({
  employeeId,
  employeeName,
  canManage,
  scheduleResolution,
  onScheduleUpdated,
  onUpdated,
}) => {
  const [data, setData] = useState<PayrollScheduleResolution | null>(scheduleResolution || null)
  const [loading, setLoading] = useState<boolean>(!scheduleResolution)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Configuration Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [resetting, setResetting] = useState<boolean>(false)

  // Form State
  const [selectedType, setSelectedType] = useState<GenerationType>('MONTHLY')
  const [generationWeekday, setGenerationWeekday] = useState<number>(0) // Monday
  const [generationDate, setGenerationDate] = useState<number>(1) // 1st of month
  const [editablePeriodDuration, setEditablePeriodDuration] = useState<number>(3)
  const [editingPeriodUnit, setEditingPeriodUnit] = useState<'DAYS' | 'HOURS'>('DAYS')
  const [visibilityPolicy, setVisibilityPolicy] = useState<'ON_FINALIZATION' | 'ON_RELEASE' | 'ON_PAYMENT_DATE'>('ON_FINALIZATION')
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10))
  const [changeReason, setChangeReason] = useState<string>('')

  const loadSchedule = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<PayrollScheduleResolution>(`/employees/${employeeId}/payroll-schedule/`)
      setData(res.data)
      syncFormWithConfig(res.data.effective_config)
      if (onScheduleUpdated) onScheduleUpdated(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load salary generation schedule.')
    } finally {
      setLoading(false)
    }
  }

  const syncFormWithConfig = (cfg: any) => {
    const rawType = cfg.generation_type || (
      cfg.pay_frequency === 'DAILY' ? 'DAILY' :
      cfg.pay_frequency === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY'
    )
    setSelectedType(rawType as GenerationType)
    setGenerationWeekday(cfg.generation_weekday ?? cfg.week_start_day ?? 0)
    setGenerationDate(cfg.generation_date ?? cfg.generation_day_of_month ?? 1)
    setEditablePeriodDuration(cfg.editable_period_duration ?? 3)
    setEditingPeriodUnit(cfg.editing_period_unit || 'DAYS')
    setVisibilityPolicy(cfg.visibility_policy || 'ON_FINALIZATION')
    setEffectiveFrom(new Date().toISOString().slice(0, 10))
    setChangeReason('')
  }

  useEffect(() => {
    if (scheduleResolution) {
      setData(scheduleResolution)
      syncFormWithConfig(scheduleResolution.effective_config)
      setLoading(false)
    } else {
      loadSchedule()
    }
  }, [employeeId, scheduleResolution])

  const handleOpenEdit = () => {
    if (!data) return
    syncFormWithConfig(data.effective_config)
    setChangeReason(data.has_override ? '' : 'Customized employee salary generation schedule')
    setShowEditModal(true)
  }

  const handleToggleOverride = async (enable: boolean) => {
    if (enable) {
      handleOpenEdit()
    } else {
      await handleResetToDefault()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeReason.trim()) {
      alert('Please enter a change reason for the audit log.')
      return
    }

    if (selectedType === 'MONTHLY' && (generationDate < 1 || generationDate > 31)) {
      alert('Generation Date must be between 1 and 31.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const payload: any = {
        generation_type: selectedType,
        effective_from: effectiveFrom,
        change_reason: changeReason.trim(),
        editable_period_duration: Number(editablePeriodDuration),
        editing_period_unit: editingPeriodUnit,
        visibility_policy: visibilityPolicy,
      }

      if (selectedType === 'WEEKLY') {
        payload.generation_weekday = Number(generationWeekday)
        payload.week_start_day = Number(generationWeekday)
        payload.pay_frequency = 'WEEKLY'
      } else if (selectedType === 'MONTHLY') {
        payload.generation_date = Number(generationDate)
        payload.generation_day_of_month = Number(generationDate)
        payload.pay_frequency = 'MONTHLY_CALENDAR'
      } else if (selectedType === 'DAILY') {
        payload.pay_frequency = 'DAILY'
      }

      const res = await apiClient.post<PayrollScheduleResolution>(`/employees/${employeeId}/payroll-schedule/`, payload)
      setData(res.data)
      setShowEditModal(false)
      setSuccessMsg(`Employee salary generation schedule set to ${selectedType} successfully!`)
      if (onScheduleUpdated) onScheduleUpdated(res.data)
      if (onUpdated) onUpdated()
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to save salary generation configuration.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    const confirmMsg = 'Revert this employee to inherit salary generation schedule from Centre / Enterprise defaults? Historical configurations will be preserved.'
    if (!window.confirm(confirmMsg)) return

    setResetting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await apiClient.post<PayrollScheduleResolution>(`/employees/${employeeId}/payroll-schedule/reset/`, {
        change_reason: `Reverted ${employeeName} to inherit default salary generation schedule`,
      })
      setData(res.data)
      setShowEditModal(false)
      setSuccessMsg('Employee reverted to inherit parent defaults successfully.')
      if (onScheduleUpdated) onScheduleUpdated(res.data)
      if (onUpdated) onUpdated()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset employee salary generation schedule.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-card rounded-2xl border border-border animate-pulse flex items-center justify-center">
        <div className="h-5 w-48 bg-muted rounded"></div>
      </div>
    )
  }

  if (!data) return null

  const cfg = data.effective_config
  const effectiveGenType: GenerationType = (
    cfg.generation_type ||
    (cfg.pay_frequency === 'DAILY' ? 'DAILY' : cfg.pay_frequency === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY')
  ) as GenerationType

  const effectiveWeekdayName = WEEKDAYS.find((d) => d.value === (cfg.generation_weekday ?? cfg.week_start_day ?? 0))?.label || 'Monday'
  const effectiveGenDate = cfg.generation_date ?? cfg.generation_day_of_month ?? 1

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors space-y-3.5">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Payroll Schedule
              </h4>
              {data.source === 'EMPLOYEE' ? (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Employee Override
                </span>
              ) : data.source === 'CENTRE' ? (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Centre Default
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Enterprise Default
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generation frequency and salary calculation cycle.
            </p>
          </div>

          {/* Quick Override Toggle & Edit Action */}
          {canManage && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50">
                <ToggleSwitch
                  id="enable-emp-override-toggle"
                  checked={data.has_override}
                  onChange={handleToggleOverride}
                  disabled={saving || resetting}
                  size="sm"
                  label={
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      Override
                    </span>
                  }
                />
              </div>

              {data.has_override && (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-slate-500" />
                  <span>Edit Configuration</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Compact 4-Column Summary Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* Column 1: Generation Type */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Generation
            </span>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              {effectiveGenType === 'DAILY' && <Sun className="w-4 h-4 text-amber-500" />}
              {effectiveGenType === 'WEEKLY' && <CalendarDays className="w-4 h-4 text-blue-500" />}
              {effectiveGenType === 'MONTHLY' && <Calendar className="w-4 h-4 text-emerald-500" />}
              <span>{effectiveGenType === 'DAILY' ? 'Daily' : effectiveGenType === 'WEEKLY' ? 'Weekly' : 'Monthly'}</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {effectiveGenType === 'DAILY' && '1 salary slip per day.'}
              {effectiveGenType === 'WEEKLY' && `Generates every ${effectiveWeekdayName}.`}
              {effectiveGenType === 'MONTHLY' && `Generates on the ${effectiveGenDate}th (clamped).`}
            </span>
          </div>

          {/* Column 2: Calculation Period */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Calculation Period
            </span>
            <div className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{data.current_period.start} → {data.current_period.end}</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {effectiveGenType === 'DAILY' && 'Single day settlement.'}
              {effectiveGenType === 'WEEKLY' && 'Contiguous 7-day period.'}
              {effectiveGenType === 'MONTHLY' && 'Calendar month cycle.'}
            </span>
          </div>

          {/* Column 3: Editing Window */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Editing Window
            </span>
            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-amber-500" />
              <span>{cfg.editable_period_duration ?? 3} {cfg.editing_period_unit ?? 'DAYS'}</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Attendance locks upon finalization.
            </span>
          </div>

          {/* Column 4: Slip Visibility */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Slip Visibility
            </span>
            <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {cfg.visibility_policy === 'ON_RELEASE'
                  ? 'Manual Release'
                  : cfg.visibility_policy === 'ON_PAYMENT_DATE'
                  ? 'On Pay Date'
                  : 'On Finalization'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Drafts hidden from staff.
            </span>
          </div>
        </div>

        {/* Subtle Metadata Row */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>Configuration source: <strong className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{data.source_display}</strong></span>
            {data.effective_from && (
              <>
                <span>•</span>
                <span>Effective since {data.effective_from}</span>
              </>
            )}
            {data.changed_by_name && (
              <>
                <span>•</span>
                <span>By {data.changed_by_name}</span>
              </>
            )}
          </div>
          {data.change_reason && (
            <span className="text-slate-400 truncate max-w-xs" title={data.change_reason}>
              Note: <em>"{data.change_reason}"</em>
            </span>
          )}
        </div>
      </div>

      {/* Simplified Configuration Modal */}
      <OwnDialog
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title={`Salary Slip Generation: ${employeeName}`}
        description="Select the generation frequency and schedule for this employee. Exactly one generation type applies."
      >
        <form onSubmit={handleSave} className="space-y-5 text-sm mt-2">
          {/* 3 Generation Type Selector Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
              Select Generation Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: DAILY */}
              <button
                type="button"
                onClick={() => setSelectedType('DAILY')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedType === 'DAILY'
                    ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sun className={`w-5 h-5 ${selectedType === 'DAILY' ? 'text-primary' : 'text-amber-500'}`} />
                  {selectedType === 'DAILY' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm">1. DAILY</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    1-day payroll periods. Generates one slip daily.
                  </div>
                </div>
              </button>

              {/* Option 2: WEEKLY */}
              <button
                type="button"
                onClick={() => setSelectedType('WEEKLY')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedType === 'WEEKLY'
                    ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <CalendarDays className={`w-5 h-5 ${selectedType === 'WEEKLY' ? 'text-primary' : 'text-blue-500'}`} />
                  {selectedType === 'WEEKLY' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm">2. WEEKLY</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Completed 7-day weekly periods.
                  </div>
                </div>
              </button>

              {/* Option 3: MONTHLY */}
              <button
                type="button"
                onClick={() => setSelectedType('MONTHLY')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedType === 'MONTHLY'
                    ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Calendar className={`w-5 h-5 ${selectedType === 'MONTHLY' ? 'text-primary' : 'text-emerald-500'}`} />
                  {selectedType === 'MONTHLY' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm">3. MONTHLY</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Standard monthly cycle (Default).
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Fields based on Selected Type */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
            {selectedType === 'DAILY' && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" /> Daily Generation Schedule
                </div>
                <p className="text-xs text-muted-foreground">
                  No weekday or monthly date selector is required. The system processes one-day payroll periods for applicable daily shifts, daily wages, or daily pro-rata hours.
                </p>
              </div>
            )}

            {selectedType === 'WEEKLY' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Salary Slip Generation Day
                </label>
                <OwnSelect
                  value={String(generationWeekday)}
                  onChange={(val) => setGenerationWeekday(Number(val))}
                  options={WEEKDAYS.map((d) => ({
                    value: String(d.value),
                    label: d.label,
                  }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  The backend generates the payroll draft on <strong>{WEEKDAYS.find((d) => d.value === generationWeekday)?.label}</strong> for the completed 7-day weekly period ending prior to this day.
                </p>
              </div>
            )}

            {selectedType === 'MONTHLY' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Salary Slip Generation Date (Day of Month)
                </label>
                <div className="flex items-center gap-3">
                  <OwnInput
                    type="number"
                    min={1}
                    max={31}
                    value={generationDate}
                    onChange={(e) => setGenerationDate(Math.min(31, Math.max(1, Number(e.target.value))))}
                    className="w-32 font-mono font-bold"
                  />
                  <span className="text-xs text-muted-foreground">Day of month (1 to 31)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The draft is generated on day <strong>{generationDate}</strong> of each month. If a month has fewer days (such as 31st in February), generation deterministically clamps to the final calendar day (Feb 28/29).
                </p>
              </div>
            )}
          </div>

          {/* Configurable Editing Window & Visibility Policy */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-foreground">
              Editing Window & Employee Visibility Policy
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Editable Window Duration
                </label>
                <div className="flex items-center gap-2">
                  <OwnInput
                    type="number"
                    min={1}
                    max={365}
                    value={editablePeriodDuration}
                    onChange={(e) => setEditablePeriodDuration(Math.max(1, Number(e.target.value)))}
                    className="w-24 font-mono font-bold"
                  />
                  <OwnSelect
                    value={editingPeriodUnit}
                    onChange={(e) => setEditingPeriodUnit(e.target.value as 'DAYS' | 'HOURS')}
                    options={[
                      { value: 'DAYS', label: 'Days' },
                      { value: 'HOURS', label: 'Hours' },
                    ]}
                    className="flex-1"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  During this post-draft window, adjustments are allowed and attendance remains editable.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Salary Slip Visibility Policy
                </label>
                <OwnSelect
                  value={visibilityPolicy}
                  onChange={(e) => setVisibilityPolicy(e.target.value as any)}
                  options={[
                    { value: 'ON_FINALIZATION', label: 'Immediately on Finalization' },
                    { value: 'ON_RELEASE', label: 'Manual Release by Admin' },
                    { value: 'ON_PAYMENT_DATE', label: 'On Scheduled Payment Date' },
                  ]}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Employees never see DRAFT or in-review payroll runs regardless of policy.
                </p>
              </div>
            </div>
          </div>

          {/* Effective Date & Audit Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Effective From Date
              </label>
              <OwnInput
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Change Reason (Audit Log)
              </label>
              <OwnInput
                type="text"
                required
                placeholder="e.g. Switched to Weekly payroll schedule"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <OwnDialogFooter className="pt-2 flex items-center justify-between gap-2 border-t border-border">
            {data.has_override && (
              <OwnButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                loading={resetting}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Revert to Defaults
              </OwnButton>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <OwnButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
              >
                Save Configuration
              </OwnButton>
            </div>
          </OwnDialogFooter>
        </form>
      </OwnDialog>
    </div>
  )
}
