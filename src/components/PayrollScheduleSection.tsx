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
  HelpCircle,
  CreditCard,
  Check
} from 'lucide-react'
import apiClient from '../services/api'
import type {
  PayrollScheduleResolution,
  PayrollScheduleConfig,
  CompensationType,
  PayFrequency,
  MonthEndRule,
  PayrollGenerationMode,
  PaymentScheduleRule
} from '../types'
import { OwnCard } from '../design-system/components/OwnCard'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnDialog, OwnDialogFooter } from '../design-system/components/OwnDialog'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'

interface PayrollScheduleSectionProps {
  employeeId: string
  employeeName: string
  canManage: boolean
  onUpdated?: () => void
}

export const PayrollScheduleSection: React.FC<PayrollScheduleSectionProps> = ({
  employeeId,
  employeeName,
  canManage,
  onUpdated,
}) => {
  const [data, setData] = useState<PayrollScheduleResolution | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [resetting, setResetting] = useState<boolean>(false)
  const [activeStepTab, setActiveStepTab] = useState<'compensation' | 'generation' | 'approval_payment' | 'audit'>('compensation')

  // Form State
  const [formData, setFormData] = useState<Partial<PayrollScheduleConfig>>({
    compensation_type: 'MONTHLY_SALARY',
    pay_frequency: 'MONTHLY_CALENDAR',
    week_start_day: 0,
    custom_cycle_start_day: 1,
    anchor_date: '',
    month_end_rule: 'CLAMP_TO_LAST_DAY',
    generation_mode: 'MANUAL',
    generation_delay_days: 1,
    generation_day_of_month: 1,
    approval_required: true,
    approver_role: 'BUSINESS_ADMIN',
    review_deadline_days: 3,
    payment_rule: 'DAY_OF_FOLLOWING_MONTH',
    payment_offset_days: 5,
    payment_day_of_month: 7,
    payment_weekday: 4,
    effective_from: new Date().toISOString().slice(0, 10),
    change_reason: '',
  })

  const loadSchedule = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<PayrollScheduleResolution>(`/employees/${employeeId}/payroll-schedule/`)
      setData(res.data)
      const cfg = res.data.effective_config
      setFormData({
        compensation_type: cfg.compensation_type || 'MONTHLY_SALARY',
        pay_frequency: cfg.pay_frequency || 'MONTHLY_CALENDAR',
        week_start_day: cfg.week_start_day ?? 0,
        custom_cycle_start_day: cfg.custom_cycle_start_day ?? 1,
        anchor_date: cfg.anchor_date || '',
        month_end_rule: cfg.month_end_rule || 'CLAMP_TO_LAST_DAY',
        generation_mode: cfg.generation_mode || 'MANUAL',
        generation_delay_days: cfg.generation_delay_days ?? 1,
        generation_day_of_month: cfg.generation_day_of_month ?? 1,
        approval_required: cfg.approval_required ?? true,
        approver_role: cfg.approver_role || 'BUSINESS_ADMIN',
        review_deadline_days: cfg.review_deadline_days ?? 3,
        payment_rule: cfg.payment_rule || 'DAY_OF_FOLLOWING_MONTH',
        payment_offset_days: cfg.payment_offset_days ?? 5,
        payment_day_of_month: cfg.payment_day_of_month ?? 7,
        payment_weekday: cfg.payment_weekday ?? 4,
        effective_from: new Date().toISOString().slice(0, 10),
        change_reason: '',
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payroll schedule.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [employeeId])

  const handleOpenEdit = () => {
    if (!data) return
    const cfg = data.effective_config
    setFormData({
      compensation_type: cfg.compensation_type || 'MONTHLY_SALARY',
      pay_frequency: cfg.pay_frequency || 'MONTHLY_CALENDAR',
      week_start_day: cfg.week_start_day ?? 0,
      custom_cycle_start_day: cfg.custom_cycle_start_day ?? 1,
      anchor_date: cfg.anchor_date || '',
      month_end_rule: cfg.month_end_rule || 'CLAMP_TO_LAST_DAY',
      generation_mode: cfg.generation_mode || 'MANUAL',
      generation_delay_days: cfg.generation_delay_days ?? 1,
      generation_day_of_month: cfg.generation_day_of_month ?? 1,
      approval_required: cfg.approval_required ?? true,
      approver_role: cfg.approver_role || 'BUSINESS_ADMIN',
      review_deadline_days: cfg.review_deadline_days ?? 3,
      payment_rule: cfg.payment_rule || 'DAY_OF_FOLLOWING_MONTH',
      payment_offset_days: cfg.payment_offset_days ?? 5,
      payment_day_of_month: cfg.payment_day_of_month ?? 7,
      payment_weekday: cfg.payment_weekday ?? 4,
      effective_from: new Date().toISOString().slice(0, 10),
      change_reason: data.has_override ? '' : 'Customized employee-specific payroll schedule override',
    })
    setActiveStepTab('compensation')
    setShowEditModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.change_reason?.trim()) {
      alert('Please enter a change reason for the audit log.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await apiClient.post<PayrollScheduleResolution>(`/employees/${employeeId}/payroll-schedule/`, formData)
      setData(res.data)
      setShowEditModal(false)
      setSuccessMsg('Employee payroll schedule configuration saved successfully!')
      if (onUpdated) onUpdated()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save payroll schedule configuration.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    const confirmMsg = 'Revert this employee to inherit settings from Centre / Enterprise defaults? Historical configurations will be preserved.'
    if (!window.confirm(confirmMsg)) return

    setResetting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await apiClient.post<PayrollScheduleResolution>(`/employees/${employeeId}/payroll-schedule/reset/`, {
        change_reason: `Reverted ${employeeName} to inherit default schedule`,
      })
      setData(res.data)
      setSuccessMsg('Employee reset to inherit defaults successfully.')
      if (onUpdated) onUpdated()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset employee payroll schedule.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-card rounded-2xl border border-border animate-pulse flex items-center justify-center">
        <div className="h-5 w-40 bg-muted rounded"></div>
      </div>
    )
  }

  if (!data) return null

  const cfg = data.effective_config

  // Helper labels
  const compTypeLabelMap: Record<CompensationType, { label: string; desc: string }> = {
    MONTHLY_SALARY: { label: 'Fixed Monthly Salary', desc: 'Calculated monthly with standard 30-day baseline' },
    DAILY_WAGE: { label: 'Daily Wage', desc: 'Calculated strictly from payable present & leave days' },
    HOURLY_WAGE: { label: 'Hourly Wage', desc: 'Calculated from aggregated active punch & overtime hours' },
    FIXED_CONTRACT: { label: 'Fixed Contract Amount', desc: 'Fixed milestone or contract compensation' },
  }

  const payFreqLabelMap: Record<PayFrequency, string> = {
    MONTHLY_CALENDAR: 'Monthly — Calendar (1st to Month End)',
    MONTHLY_CUSTOM: `Monthly — Custom Cycle (${cfg.custom_cycle_start_day}th to ${cfg.custom_cycle_start_day > 1 ? cfg.custom_cycle_start_day - 1 : 31}th)`,
    WEEKLY: `Weekly (${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][cfg.week_start_day || 0]} Start)`,
    FORTNIGHTLY: 'Fortnightly (14-day consecutive cycle)',
    DAILY: 'Daily Settlement',
    CUSTOM_PERIOD: 'Custom Deterministic Period',
  }

  const genModeLabelMap: Record<PayrollGenerationMode, string> = {
    MANUAL: 'Manual Batch Execution',
    AUTOMATIC_DRAFT_AFTER_PERIOD_END: `Automatic Draft (${cfg.generation_delay_days || 1} day(s) after period end)`,
    AUTOMATIC_DRAFT_ON_CONFIGURED_DATE: `Automatic Draft (On the ${cfg.generation_day_of_month || 1}st of month)`,
    AUTOMATIC_DRAFT_BEFORE_PERIOD_END: 'Automatic Draft (Preliminary draft before period end)',
  }

  const paymentRuleLabelMap: Record<PaymentScheduleRule, string> = {
    DAY_OF_FOLLOWING_MONTH: `${cfg.payment_day_of_month || 7}th of Following Month`,
    DAYS_AFTER_PERIOD_END: `${cfg.payment_offset_days || 5} days after Period End`,
    SPECIFIED_WEEKDAY: `Following ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][cfg.payment_weekday || 4]}`,
    SAME_DAY_AS_PERIOD_END: 'Same Day as Period End',
    CUSTOM_RULE: 'Custom Rule',
    MANUAL: 'Manual Payment Selection',
  }

  return (
    <div className="space-y-4">
      {/* Alert Banners */}
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
      <OwnCard className="p-5 sm:p-6 bg-card border-border shadow-xs space-y-5">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" /> Payroll Schedule & Salary Cycle
              </span>

              {/* Source Provenance Badge */}
              {data.source === 'EMPLOYEE' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Employee Override Active
                </span>
              ) : data.source === 'CENTRE' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Centre Default Applied
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Enterprise Default Applied
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Configures calculation periods, automatic draft triggers, approval gates, and disbursement rules.
            </p>
          </div>

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              {data.has_override && (
                <OwnButton
                  variant="outline"
                  size="sm"
                  onClick={handleResetToDefault}
                  loading={resetting}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Revert to Defaults
                </OwnButton>
              )}

              <OwnButton
                variant={data.has_override ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleOpenEdit}
                icon={<Edit3 className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                {data.has_override ? 'Edit Configuration' : 'Customize for Employee'}
              </OwnButton>
            </div>
          )}
        </div>

        {/* 6-Grid Structured Key Attributes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          {/* Card 1: Compensation Type */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              1. Compensation Type
            </span>
            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              {compTypeLabelMap[cfg.compensation_type]?.label || cfg.compensation_type}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {compTypeLabelMap[cfg.compensation_type]?.desc}
            </p>
          </div>

          {/* Card 2: Effective Pay Schedule */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              2. Effective Pay Schedule
            </span>
            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" />
              {payFreqLabelMap[cfg.pay_frequency] || cfg.pay_frequency}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Month-End Handling: <strong className="text-foreground">{cfg.month_end_rule === 'CLAMP_TO_LAST_DAY' ? 'Clamp to Last Day' : 'Next Available Day'}</strong>
            </p>
          </div>

          {/* Card 3: Salary Calculation Period */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              3. Current Calculation Period
            </span>
            <div className="font-bold text-sm font-mono text-primary flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              {data.current_period.start} → {data.current_period.end}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Contiguous cycle calculated by the backend payroll engine.
            </p>
          </div>

          {/* Card 4: Draft Generation Schedule */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              4. Draft Generation Schedule
            </span>
            <div className="font-bold text-sm text-foreground">
              {genModeLabelMap[cfg.generation_mode] || cfg.generation_mode}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Automatic triggers generate DRAFT runs only (never silently finalized).
            </p>
          </div>

          {/* Card 5: Approval Requirements */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              5. Approval Requirements
            </span>
            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-500" />
              {cfg.approval_required ? `Required (${cfg.approver_role})` : 'Approval Optional'}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Review Window: <strong className="text-foreground">{cfg.review_deadline_days || 3} days</strong> before lock.
            </p>
          </div>

          {/* Card 6: Expected Payment Schedule */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              6. Expected Payment Schedule
            </span>
            <div className="font-bold text-sm text-foreground">
              {paymentRuleLabelMap[cfg.payment_rule] || cfg.payment_rule}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Expected Date: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{data.expected_payment_date}</strong> (Independent of calculation status).
            </p>
          </div>
        </div>

        {/* Provenance Footer */}
        <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>Effective Since: <strong className="text-foreground font-semibold">{data.effective_from}</strong></span>
            {data.changed_by_name && <span>• Configured by: <strong className="text-foreground font-semibold">{data.changed_by_name}</strong></span>}
            {data.change_reason && <span>• Reason: <em>"{data.change_reason}"</em></span>}
          </div>
          <div className="text-[10px] text-muted-foreground/80">
            Source: <strong className="capitalize">{data.source_display}</strong>
          </div>
        </div>
      </OwnCard>

      {/* Edit Configuration Modal */}
      <OwnDialog
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title={`Payroll Schedule & Cycle: ${employeeName}`}
        description="Configure compensation calculation mechanics, pay period frequency, draft generation, and disbursement timing."
      >
        <form onSubmit={handleSave} className="space-y-4 text-sm mt-2">
          {/* Step / Section Navigation */}
          <div className="flex items-center border-b border-border text-xs font-semibold gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveStepTab('compensation')}
              className={`px-3 py-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeStepTab === 'compensation' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              1. Compensation & Period
            </button>
            <button
              type="button"
              onClick={() => setActiveStepTab('generation')}
              className={`px-3 py-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeStepTab === 'generation' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              2. Draft Generation
            </button>
            <button
              type="button"
              onClick={() => setActiveStepTab('approval_payment')}
              className={`px-3 py-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeStepTab === 'approval_payment' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              3. Approval & Payment
            </button>
            <button
              type="button"
              onClick={() => setActiveStepTab('audit')}
              className={`px-3 py-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeStepTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              4. Effective Date & Audit
            </button>
          </div>

          {/* SECTION 1: COMPENSATION & PERIOD */}
          {activeStepTab === 'compensation' && (
            <div className="space-y-3.5 py-1">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Compensation Type</label>
                <OwnSelect
                  value={formData.compensation_type || 'MONTHLY_SALARY'}
                  onChange={(e) => setFormData((f) => ({ ...f, compensation_type: e.target.value as CompensationType }))}
                  options={[
                    { value: 'MONTHLY_SALARY', label: 'Fixed Monthly Salary (Monthly baseline)' },
                    { value: 'DAILY_WAGE', label: 'Daily Wage (Payable present & leave days)' },
                    { value: 'HOURLY_WAGE', label: 'Hourly Wage (Work seconds & overtime rate)' },
                    { value: 'FIXED_CONTRACT', label: 'Fixed Contract Amount (Milestone/Contract rate)' },
                  ]}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Determines how base earnings are calculated from attendance metrics and rates.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Pay Frequency & Cycle</label>
                <OwnSelect
                  value={formData.pay_frequency || 'MONTHLY_CALENDAR'}
                  onChange={(e) => setFormData((f) => ({ ...f, pay_frequency: e.target.value as PayFrequency }))}
                  options={[
                    { value: 'MONTHLY_CALENDAR', label: 'Monthly — Calendar (1st to last day)' },
                    { value: 'MONTHLY_CUSTOM', label: 'Monthly — Custom Cycle (e.g. 5th to 4th)' },
                    { value: 'WEEKLY', label: 'Weekly (Configurable week start)' },
                    { value: 'FORTNIGHTLY', label: 'Fortnightly (14-day consecutive)' },
                    { value: 'DAILY', label: 'Daily (Every calendar day)' },
                    { value: 'CUSTOM_PERIOD', label: 'Custom Deterministic Period' },
                  ]}
                />
              </div>

              {formData.pay_frequency === 'MONTHLY_CUSTOM' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                  <OwnInput
                    label="Cycle Start Day (1-31)"
                    type="number"
                    min={1}
                    max={31}
                    value={formData.custom_cycle_start_day || 1}
                    onChange={(e) => setFormData((f) => ({ ...f, custom_cycle_start_day: parseInt(e.target.value) || 1 }))}
                  />
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Month-End Handling Rule</label>
                    <OwnSelect
                      value={formData.month_end_rule || 'CLAMP_TO_LAST_DAY'}
                      onChange={(e) => setFormData((f) => ({ ...f, month_end_rule: e.target.value as MonthEndRule }))}
                      options={[
                        { value: 'CLAMP_TO_LAST_DAY', label: 'Clamp to Last Day (e.g. Feb 28)' },
                        { value: 'NEXT_AVAILABLE_DAY', label: 'Next Available Day' },
                      ]}
                    />
                  </div>
                </div>
              )}

              {formData.pay_frequency === 'WEEKLY' && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <label className="text-xs font-semibold text-foreground block mb-1">Week-Start Day</label>
                  <OwnSelect
                    value={String(formData.week_start_day ?? 0)}
                    onChange={(e) => setFormData((f) => ({ ...f, week_start_day: parseInt(e.target.value) || 0 }))}
                    options={[
                      { value: '0', label: 'Monday to Sunday' },
                      { value: '1', label: 'Tuesday to Monday' },
                      { value: '2', label: 'Wednesday to Tuesday' },
                      { value: '3', label: 'Thursday to Wednesday' },
                      { value: '4', label: 'Friday to Thursday' },
                      { value: '5', label: 'Saturday to Friday' },
                      { value: '6', label: 'Sunday to Saturday' },
                    ]}
                  />
                </div>
              )}

              {formData.pay_frequency === 'FORTNIGHTLY' && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <OwnInput
                    label="Anchor Date for Consecutive 14-Day Blocks (Optional)"
                    type="date"
                    value={formData.anchor_date || ''}
                    onChange={(e) => setFormData((f) => ({ ...f, anchor_date: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Leave blank to use semi-monthly calendar splits (1st–15th and 16th–end).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: DRAFT GENERATION */}
          {activeStepTab === 'generation' && (
            <div className="space-y-3.5 py-1">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Payroll Draft Generation Mode</label>
                <OwnSelect
                  value={formData.generation_mode || 'MANUAL'}
                  onChange={(e) => setFormData((f) => ({ ...f, generation_mode: e.target.value as PayrollGenerationMode }))}
                  options={[
                    { value: 'MANUAL', label: 'Manual Batch Execution' },
                    { value: 'AUTOMATIC_DRAFT_AFTER_PERIOD_END', label: 'Automatic Draft After Period End' },
                    { value: 'AUTOMATIC_DRAFT_ON_CONFIGURED_DATE', label: 'Automatic Draft on Configured Day of Month' },
                    { value: 'AUTOMATIC_DRAFT_BEFORE_PERIOD_END', label: 'Automatic Draft Before Period End (Preliminary)' },
                  ]}
                />
              </div>

              {formData.generation_mode === 'AUTOMATIC_DRAFT_AFTER_PERIOD_END' && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <OwnInput
                    label="Processing Delay (Days after period ends)"
                    type="number"
                    min={0}
                    max={30}
                    value={formData.generation_delay_days || 1}
                    onChange={(e) => setFormData((f) => ({ ...f, generation_delay_days: parseInt(e.target.value) || 0 }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Allows attendance logs, overtime punches, and leave approvals to be fully reconciled before draft calculation.
                  </p>
                </div>
              )}

              {formData.generation_mode === 'AUTOMATIC_DRAFT_ON_CONFIGURED_DATE' && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <OwnInput
                    label="Generation Day of Month (1-31)"
                    type="number"
                    min={1}
                    max={31}
                    value={formData.generation_day_of_month || 1}
                    onChange={(e) => setFormData((f) => ({ ...f, generation_day_of_month: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Guarantee:</strong> Automatic generation only creates DRAFT runs. It never silently marks records as approved, finalized, or paid.
                </span>
              </div>
            </div>
          )}

          {/* SECTION 3: APPROVAL & PAYMENT */}
          {activeStepTab === 'approval_payment' && (
            <div className="space-y-3.5 py-1">
              {/* Approval Gate */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Require Formal Approval Before Finalization</span>
                    <span className="text-[11px] text-muted-foreground">Blocks final locking until approved by authorized role</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.approval_required ?? true}
                    onChange={(e) => setFormData((f) => ({ ...f, approval_required: e.target.checked }))}
                    className="h-4 w-4 rounded border-border text-primary cursor-pointer"
                  />
                </div>

                {formData.approval_required && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/80">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Authorized Approver Role</label>
                      <OwnSelect
                        value={formData.approver_role || 'BUSINESS_ADMIN'}
                        onChange={(e) => setFormData((f) => ({ ...f, approver_role: e.target.value }))}
                        options={[
                          { value: 'BUSINESS_ADMIN', label: 'Business Admin (Enterprise)' },
                          { value: 'MANAGER', label: 'Centre Manager' },
                          { value: 'SUPERADMIN', label: 'SuperAdmin' },
                        ]}
                      />
                    </div>
                    <OwnInput
                      label="Review Deadline (Days)"
                      type="number"
                      min={1}
                      max={30}
                      value={formData.review_deadline_days || 3}
                      onChange={(e) => setFormData((f) => ({ ...f, review_deadline_days: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                )}
              </div>

              {/* Payment Schedule Rule */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground block mb-1">Expected Payment Timing</label>
                <OwnSelect
                  value={formData.payment_rule || 'DAY_OF_FOLLOWING_MONTH'}
                  onChange={(e) => setFormData((f) => ({ ...f, payment_rule: e.target.value as PaymentScheduleRule }))}
                  options={[
                    { value: 'DAY_OF_FOLLOWING_MONTH', label: 'Fixed Day of Following Month (e.g. 7th)' },
                    { value: 'DAYS_AFTER_PERIOD_END', label: 'Fixed Days After Period End' },
                    { value: 'SPECIFIED_WEEKDAY', label: 'Specified Weekday (e.g. Following Friday)' },
                    { value: 'SAME_DAY_AS_PERIOD_END', label: 'Same Day as Period End' },
                    { value: 'MANUAL', label: 'Manual Selection' },
                  ]}
                />

                {formData.payment_rule === 'DAY_OF_FOLLOWING_MONTH' && (
                  <OwnInput
                    label="Payment Day of Month (1-31)"
                    type="number"
                    min={1}
                    max={31}
                    value={formData.payment_day_of_month || 7}
                    onChange={(e) => setFormData((f) => ({ ...f, payment_day_of_month: parseInt(e.target.value) || 1 }))}
                  />
                )}

                {formData.payment_rule === 'DAYS_AFTER_PERIOD_END' && (
                  <OwnInput
                    label="Payment Offset Days (after period end)"
                    type="number"
                    min={0}
                    max={60}
                    value={formData.payment_offset_days || 5}
                    onChange={(e) => setFormData((f) => ({ ...f, payment_offset_days: parseInt(e.target.value) || 0 }))}
                  />
                )}

                {formData.payment_rule === 'SPECIFIED_WEEKDAY' && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Specified Weekday</label>
                    <OwnSelect
                      value={String(formData.payment_weekday ?? 4)}
                      onChange={(e) => setFormData((f) => ({ ...f, payment_weekday: parseInt(e.target.value) || 4 }))}
                      options={[
                        { value: '0', label: 'Monday' },
                        { value: '1', label: 'Tuesday' },
                        { value: '2', label: 'Wednesday' },
                        { value: '3', label: 'Thursday' },
                        { value: '4', label: 'Friday' },
                        { value: '5', label: 'Saturday' },
                        { value: '6', label: 'Sunday' },
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: EFFECTIVE DATE & AUDIT */}
          {activeStepTab === 'audit' && (
            <div className="space-y-3.5 py-1">
              <OwnInput
                label="Effective From Date"
                type="date"
                required
                value={formData.effective_from || ''}
                onChange={(e) => setFormData((f) => ({ ...f, effective_from: e.target.value }))}
              />

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Reason for Override / Change <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.change_reason || ''}
                  onChange={(e) => setFormData((f) => ({ ...f, change_reason: e.target.value }))}
                  placeholder="e.g. Employee transitioned to weekly daily-wage schedule with Friday disbursements."
                  className="w-full text-xs p-2.5 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border text-[11px] text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground block">Historical Protection:</span>
                <p>
                  Any existing finalized payroll runs remain locked and immutable. This schedule applies to future payroll runs effective from the selected date.
                </p>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <OwnDialogFooter className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              Step {activeStepTab === 'compensation' ? '1' : activeStepTab === 'generation' ? '2' : activeStepTab === 'approval_payment' ? '3' : '4'} of 4
            </div>

            <div className="flex items-center gap-2">
              <OwnButton type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                Cancel
              </OwnButton>

              {activeStepTab !== 'audit' ? (
                <OwnButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (activeStepTab === 'compensation') setActiveStepTab('generation')
                    else if (activeStepTab === 'generation') setActiveStepTab('approval_payment')
                    else if (activeStepTab === 'approval_payment') setActiveStepTab('audit')
                  }}
                >
                  Next Section →
                </OwnButton>
              ) : (
                <OwnButton type="submit" variant="primary" size="sm" loading={saving} icon={<Check className="w-4 h-4" />}>
                  Save Schedule Override
                </OwnButton>
              )}
            </div>
          </OwnDialogFooter>
        </form>
      </OwnDialog>
    </div>
  )
}
