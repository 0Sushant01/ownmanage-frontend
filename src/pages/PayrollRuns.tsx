import React, { useState, useEffect } from 'react'
import { Zap, CreditCard, Lock, CheckCircle2, Clock, Send, Edit3, AlertTriangle } from 'lucide-react'
import apiClient from '../services/api'
import { Can } from '../components/Can'
import { CentreSelector } from '../components/CentreSelector'
import type { PayrollRun, PayrollException } from '../types'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnCard } from '../design-system/components/OwnCard'
import { OwnStatusBadge } from '../design-system/components/OwnBadge'
import { OwnDialog, OwnDialogFooter } from '../design-system/components/OwnDialog'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'

export const PayrollRuns: React.FC = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [centres, setCentres] = useState<any[]>([])
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all')
  const [loading, setLoading] = useState<boolean>(true)
  const [showCalculateModal, setShowCalculateModal] = useState<boolean>(false)

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false)
  const [adjustRunId, setAdjustRunId] = useState<string | null>(null)
  const [adjustParams, setAdjustParams] = useState({
    employee_id: '',
    adjustment_type: 'ALLOWANCE',
    name: '',
    amount: '',
    reason: '',
  })
  const [adjusting, setAdjusting] = useState<boolean>(false)

  // Exceptions Review Modal State
  const [showExceptionsModal, setShowExceptionsModal] = useState<boolean>(false)
  const [selectedExceptionsRun, setSelectedExceptionsRun] = useState<PayrollRun | null>(null)
  const [exceptions, setExceptions] = useState<PayrollException[]>([])
  const [loadingExceptions, setLoadingExceptions] = useState<boolean>(false)
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<string>('all')
  const [exceptionStatusFilter, setExceptionStatusFilter] = useState<string>('all')

  // Review Decision Prompt State
  const [showReviewPrompt, setShowReviewPrompt] = useState<boolean>(false)
  const [activeException, setActiveException] = useState<PayrollException | null>(null)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'WAIVE' | 'REJECT' | 'ADJUST_AMOUNT'>('APPROVE')
  const [reviewAmount, setReviewAmount] = useState<string>('')
  const [reviewReason, setReviewReason] = useState<string>('')
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)

  const [schedulePeriods, setSchedulePeriods] = useState<any[]>([])
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState<string>('')
  const [previewSchedule, setPreviewSchedule] = useState<any>(null)


  const [calcParams, setCalcParams] = useState({
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    centre_id: '',
  })

  const [calculating, setCalculating] = useState<boolean>(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadSchedulePeriods = async (centreId?: string) => {
    try {
      const params: Record<string, string> = {}
      if (centreId && centreId !== 'all') {
        params.centre_id = centreId
      }
      const res = await apiClient.get('/payroll/schedule-periods/', { params })
      setSchedulePeriods(res.data.periods || [])
      setPreviewSchedule(res.data)
      if (res.data.current_period) {
        setCalcParams((prev) => ({
          ...prev,
          period_start: res.data.current_period.start,
          period_end: res.data.current_period.end,
        }))
        setSelectedPeriodPreset(res.data.current_period.start)
      }
    } catch {
      // Fallback to month boundaries
    }
  }

  const loadPayrollRuns = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (selectedCentre && selectedCentre !== 'all') {
        params.centre_id = selectedCentre
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (frequencyFilter && frequencyFilter !== 'all') {
        params.pay_frequency = frequencyFilter
      }
      const [runsRes, cenRes] = await Promise.all([
        apiClient.get('/payroll/runs/', { params }),
        apiClient.get('/centres/'),
      ])
      setRuns(runsRes.data)
      setCentres(cenRes.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payroll runs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayrollRuns()
  }, [selectedCentre, statusFilter, frequencyFilter])

  useEffect(() => {
    if (showCalculateModal) {
      loadSchedulePeriods(calcParams.centre_id)
    }
  }, [showCalculateModal, calcParams.centre_id])

  const handleRunCalculation = async (e: React.FormEvent) => {
    e.preventDefault()
    setCalculating(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const payload: any = {
        period_start: calcParams.period_start,
        period_end: calcParams.period_end,
      }
      if (calcParams.centre_id) {
        payload.centre_id = calcParams.centre_id
      }
      const res = await apiClient.post('/payroll/runs/', payload)
      setShowCalculateModal(false)
      setSuccessMsg(`Payroll run calculated successfully for ${res.data.total_employees} employees!`)
      await loadPayrollRuns()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to calculate batch payroll.')
    } finally {
      setCalculating(false)
    }
  }

  const handleApprove = async (runId: string) => {
    if (!window.confirm('Approve this payroll run?')) return
    setActionLoadingId(runId)
    setError(null)
    try {
      await apiClient.post(`/payroll/runs/${runId}/approve/`, {})
      setSuccessMsg('Payroll run approved!')
      await loadPayrollRuns()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve payroll run.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleFinalize = async (runId: string) => {
    if (!window.confirm('Finalize & lock this payroll run? This will mark payslips as final and lock corresponding attendance.')) return
    setActionLoadingId(runId)
    setError(null)
    try {
      await apiClient.post(`/payroll/runs/${runId}/finalize/`, {})
      setSuccessMsg('Payroll run finalized and attendance locked!')
      await loadPayrollRuns()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to finalize payroll run.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRelease = async (runId: string) => {
    if (!window.confirm('Release salary slips to employees? Staff will be able to view their finalized payslips.')) return
    setActionLoadingId(runId)
    setError(null)
    try {
      await apiClient.post(`/payroll/runs/${runId}/release/`, {})
      setSuccessMsg('Salary slips released to employees successfully!')
      await loadPayrollRuns()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to release salary slips.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleOpenAdjustModal = (runId: string) => {
    setAdjustRunId(runId)
    setAdjustParams({
      employee_id: '',
      adjustment_type: 'ALLOWANCE',
      name: '',
      amount: '',
      reason: '',
    })
    setShowAdjustModal(true)
  }

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustRunId) return
    if (!adjustParams.employee_id.trim()) {
      alert('Please enter an Employee ID.')
      return
    }
    if (!adjustParams.name.trim() || !adjustParams.amount || !adjustParams.reason.trim()) {
      alert('Please fill in adjustment name, amount, and reason.')
      return
    }
    setAdjusting(true)
    setError(null)
    try {
      await apiClient.post(`/payroll/runs/${adjustRunId}/adjust/`, {
        employee_id: adjustParams.employee_id.trim(),
        adjustment_type: adjustParams.adjustment_type,
        name: adjustParams.name.trim(),
        amount: Number(adjustParams.amount),
        reason: adjustParams.reason.trim(),
      })
      setShowAdjustModal(false)
      setSuccessMsg('Adjustment applied and payroll recalculated successfully!')
      await loadPayrollRuns()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply payroll adjustment.')
    } finally {
      setAdjusting(false)
    }
  }

  const loadRunExceptions = async (runId: string) => {
    setLoadingExceptions(true)
    try {
      const params: Record<string, string> = {}
      if (exceptionTypeFilter && exceptionTypeFilter !== 'all') {
        params.type = exceptionTypeFilter
      }
      if (exceptionStatusFilter && exceptionStatusFilter !== 'all') {
        params.status = exceptionStatusFilter
      }
      const res = await apiClient.get(`/payroll/runs/${runId}/exceptions/`, { params })
      setExceptions(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payroll exceptions.')
    } finally {
      setLoadingExceptions(false)
    }
  }

  useEffect(() => {
    if (selectedExceptionsRun && showExceptionsModal) {
      loadRunExceptions(selectedExceptionsRun.id)
    }
  }, [exceptionTypeFilter, exceptionStatusFilter])

  const handleOpenExceptionsModal = (run: PayrollRun) => {
    setSelectedExceptionsRun(run)
    setShowExceptionsModal(true)
    loadRunExceptions(run.id)
  }

  const handleInitiateReview = (
    exc: PayrollException,
    action: 'APPROVE' | 'WAIVE' | 'REJECT' | 'ADJUST_AMOUNT'
  ) => {
    setActiveException(exc)
    setReviewAction(action)
    setReviewAmount(String(exc.decision_amount ?? exc.proposed_amount))
    setReviewReason('')
    setShowReviewPrompt(true)
  }

  const handleSubmitReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeException) return
    if (!reviewReason.trim()) {
      alert('A mandatory reason is required for review decisions.')
      return
    }
    setSubmittingReview(true)
    setError(null)
    try {
      const payload: any = {
        action: reviewAction,
        reason: reviewReason.trim(),
      }
      if (reviewAction === 'ADJUST_AMOUNT') {
        payload.amount = Number(reviewAmount)
      }
      await apiClient.post(`/payroll/exceptions/${activeException.id}/review/`, payload)
      setShowReviewPrompt(false)
      setSuccessMsg(`Exception decision applied successfully for ${activeException.employee_name}!`)
      if (selectedExceptionsRun) {
        await loadRunExceptions(selectedExceptionsRun.id)
      }
      await loadPayrollRuns()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit exception review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <OwnPageHeader
        title="Payroll Processing"
        description="Batched payroll cycle: Calculate → Review → Approve → Finalize"
        action={
          <Can permission="payroll.calculate">
            <OwnButton
              variant="primary"
              onClick={() => setShowCalculateModal(true)}
              icon={<Zap className="w-4 h-4" />}
            >
              Run Batch Payroll
            </OwnButton>
          </Can>
        }
      />

      {/* Filter bar with Centre, Status, and Frequency selectors */}
      <OwnFilterBar>
        <div className="w-64">
          <CentreSelector
            value={selectedCentre}
            onChange={(val: string) => setSelectedCentre(val)}
            allowAll={true}
          />
        </div>

        <div className="w-48">
          <OwnSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Run Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'RELEASED', label: 'Released' },
              { value: 'PAID', label: 'Paid' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>

        <div className="w-56">
          <OwnSelect
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Pay Frequencies' },
              { value: 'MONTHLY_CALENDAR', label: 'Monthly — Calendar' },
              { value: 'MONTHLY_CUSTOM', label: 'Monthly — Custom Cycle' },
              { value: 'WEEKLY', label: 'Weekly' },
              { value: 'FORTNIGHTLY', label: 'Fortnightly' },
            ]}
          />
        </div>
      </OwnFilterBar>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Payroll Runs Table */}
      {loading ? (
        <div className="flex items-center justify-center p-16 bg-card rounded-2xl border border-border">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : runs.length === 0 ? (
        <OwnEmptyState
          icon={<CreditCard className="w-8 h-8 text-muted-foreground" />}
          title="No Payroll Runs Initiated"
          description="Click 'Run Batch Payroll' to calculate salaries, overtime, and leave deductions for the current pay period."
          action={
            <Can permission="payroll.calculate">
              <OwnButton variant="primary" onClick={() => setShowCalculateModal(true)}>
                Run Batch Payroll
              </OwnButton>
            </Can>
          }
        />
      ) : (
        <OwnCard className="overflow-hidden border-border bg-card shadow-xs">
          {/* Mobile View: Fluid Responsive Cards */}
          <div className="md:hidden divide-y divide-border">
            {runs.map((r) => (
              <div key={r.id} className="p-4 space-y-3 transition-colors hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground text-sm font-mono">{r.period_start} → {r.period_end}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.centre_name ? `Centre: ${r.centre_name}` : 'All Enterprise Centres'}
                      {r.expected_payment_date && ` • Expected Pay: ${r.expected_payment_date}`}
                    </div>
                    {r.editing_deadline && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Deadline: {new Date(r.editing_deadline).toLocaleDateString()}</span>
                        <span className={r.is_editing_open ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                          {r.is_editing_open ? '(Window Open)' : '(Closed)'}
                        </span>
                      </div>
                    )}
                  </div>
                  <OwnStatusBadge status={r.status || 'CALCULATED'} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Employees</span>
                    <span className="font-mono text-foreground font-semibold">{r.total_employees} staff</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Gross Payout</span>
                    <span className="font-mono text-foreground font-semibold">
                      ₹{Number(r.total_gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Deductions</span>
                    <span className="font-mono text-destructive font-semibold">
                      -₹{Number(r.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Net Payout</span>
                    <span className="font-mono text-primary font-bold text-sm">
                      ₹{Number(r.total_net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <OwnButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenExceptionsModal(r)}
                    icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  >
                    Exceptions
                  </OwnButton>

                  {r.is_editing_open && (r.status === 'DRAFT' || r.status === 'CALCULATED' || r.status === 'APPROVED') && (
                    <Can permission="payroll.calculate">
                      <OwnButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenAdjustModal(r.id)}
                        icon={<Edit3 className="w-3.5 h-3.5 text-blue-500" />}
                      >
                        Adjust
                      </OwnButton>
                    </Can>
                  )}

                  {r.status === 'CALCULATED' && (
                    <Can permission="payroll.approve">
                      <OwnButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleApprove(r.id)}
                        loading={actionLoadingId === r.id}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        className="flex-1 justify-center"
                      >
                        Approve Run
                      </OwnButton>
                    </Can>
                  )}

                  {r.status === 'APPROVED' && (
                    <Can permission="payroll.finalize">
                      <OwnButton
                        size="sm"
                        variant="primary"
                        onClick={() => handleFinalize(r.id)}
                        loading={actionLoadingId === r.id}
                        icon={<Lock className="w-3.5 h-3.5" />}
                        className="flex-1 justify-center"
                      >
                        Finalize & Lock Run
                      </OwnButton>
                    </Can>
                  )}

                  {r.status === 'FINALIZED' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 py-1">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Finalized</span>
                      </span>
                      <Can permission="payroll.finalize">
                        <OwnButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRelease(r.id)}
                          loading={actionLoadingId === r.id}
                          icon={<Send className="w-3.5 h-3.5 text-primary" />}
                        >
                          Release Slips
                        </OwnButton>
                      </Can>
                    </div>
                  )}

                  {r.status === 'RELEASED' && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5 py-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Released to Staff</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / Tablet View: Wide Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Pay Period</th>
                  <th className="px-6 py-4">Scope</th>
                  <th className="px-6 py-4">Expected Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Employees</th>
                  <th className="px-6 py-4">Gross Payout</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Payout</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40 transition">
                    <td className="px-6 py-4 font-mono font-medium text-foreground">
                      <div>{r.period_start} → {r.period_end}</div>
                      {r.pay_frequency && (
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {r.pay_frequency.replace(/_/g, ' ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">
                        {r.centre_name ? `Centre: ${r.centre_name}` : 'All Enterprise Centres'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {r.expected_payment_date ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{r.expected_payment_date}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <OwnStatusBadge status={r.status || 'CALCULATED'} />
                      {r.editing_deadline && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                          <Clock className="w-2.5 h-2.5 text-amber-500" />
                          <span>Deadline: {new Date(r.editing_deadline).toLocaleDateString()}</span>
                          <span className={r.is_editing_open ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                            {r.is_editing_open ? '(Open)' : '(Closed)'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{r.total_employees}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">
                      ₹{Number(r.total_gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-mono text-destructive">
                      -₹{Number(r.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-primary">
                      ₹{Number(r.total_net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <OwnButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenExceptionsModal(r)}
                          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        >
                          Exceptions
                        </OwnButton>

                        {r.is_editing_open && (r.status === 'DRAFT' || r.status === 'CALCULATED' || r.status === 'APPROVED') && (
                          <Can permission="payroll.calculate">
                            <OwnButton
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenAdjustModal(r.id)}
                              icon={<Edit3 className="w-3.5 h-3.5 text-blue-500" />}
                            >
                              Adjust
                            </OwnButton>
                          </Can>
                        )}

                        {r.status === 'CALCULATED' && (
                          <Can permission="payroll.approve">
                            <OwnButton
                              size="sm"
                              variant="secondary"
                              onClick={() => handleApprove(r.id)}
                              loading={actionLoadingId === r.id}
                              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            >
                              Approve
                            </OwnButton>
                          </Can>
                        )}

                        {r.status === 'APPROVED' && (
                          <Can permission="payroll.finalize">
                            <OwnButton
                              size="sm"
                              variant="primary"
                              onClick={() => handleFinalize(r.id)}
                              loading={actionLoadingId === r.id}
                              icon={<Lock className="w-3.5 h-3.5" />}
                            >
                              Finalize & Lock
                            </OwnButton>
                          </Can>
                        )}

                        {r.status === 'FINALIZED' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <Lock className="w-3 h-3 text-muted-foreground" />
                              <span>Finalized</span>
                            </span>
                            <Can permission="payroll.finalize">
                              <OwnButton
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRelease(r.id)}
                                loading={actionLoadingId === r.id}
                                icon={<Send className="w-3.5 h-3.5 text-primary" />}
                              >
                                Release
                              </OwnButton>
                            </Can>
                          </div>
                        )}

                        {r.status === 'RELEASED' && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Released</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OwnCard>
      )}

      {/* Run Calculation Modal */}
      <OwnDialog
        open={showCalculateModal}
        onOpenChange={setShowCalculateModal}
        title="Batch Payroll Calculation"
        description="Select the pay period dates and centre scope to run automatic calculations for all active employees."
      >
        <form onSubmit={handleRunCalculation} className="space-y-4 text-sm mt-2">
          {/* Predefined Schedule Preset */}
          {schedulePeriods.length > 0 && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Calculated Pay Period (From {previewSchedule?.source_display || 'Pay Schedule'})
              </label>
              <OwnSelect
                value={selectedPeriodPreset}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedPeriodPreset(val)
                  const match = schedulePeriods.find((p) => p.period_start === val)
                  if (match) {
                    setCalcParams((prev) => ({
                      ...prev,
                      period_start: match.period_start,
                      period_end: match.period_end,
                    }))
                  }
                }}
                options={schedulePeriods.map((p) => ({
                  value: p.period_start,
                  label: `${p.label} (Expected Pay: ${p.expected_payment_date})`,
                }))}
              />
              <p className="text-[11px] text-muted-foreground">
                Automatically resolves start and end dates according to the effective pay frequency.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <OwnInput
              label="Period Start *"
              type="date"
              required
              value={calcParams.period_start}
              onChange={(e) => setCalcParams({ ...calcParams, period_start: e.target.value })}
            />
            <OwnInput
              label="Period End *"
              type="date"
              required
              value={calcParams.period_end}
              onChange={(e) => setCalcParams({ ...calcParams, period_end: e.target.value })}
            />
          </div>

          <OwnSelect
            label="Centre Scope (Optional)"
            value={calcParams.centre_id}
            onChange={(e) => setCalcParams({ ...calcParams, centre_id: e.target.value })}
            options={[
              { value: '', label: 'All Enterprise Centres' },
              ...centres.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to process all active employees across the entire Enterprise.
          </p>

          <OwnDialogFooter className="mt-6">
            <OwnButton
              type="button"
              variant="outline"
              onClick={() => setShowCalculateModal(false)}
            >
              Cancel
            </OwnButton>
            <OwnButton
              type="submit"
              variant="primary"
              loading={calculating}
            >
              Calculate Now
            </OwnButton>
          </OwnDialogFooter>
        </form>
      </OwnDialog>

      {/* In-Flight Payroll Adjustment Modal */}
      <OwnDialog
        open={showAdjustModal}
        onOpenChange={setShowAdjustModal}
        title="Post Payroll Adjustment"
        description="Authorized adjustment applied during the open editing window before finalization. Line items and totals will recalculate automatically with audit logging."
      >
        <form onSubmit={handlePostAdjustment} className="space-y-4 text-sm mt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
              Employee ID (UUID)
            </label>
            <OwnInput
              type="text"
              required
              placeholder="Enter Employee UUID"
              value={adjustParams.employee_id}
              onChange={(e) => setAdjustParams({ ...adjustParams, employee_id: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Adjustment Type
              </label>
              <OwnSelect
                value={adjustParams.adjustment_type}
                onChange={(e) => setAdjustParams({ ...adjustParams, adjustment_type: e.target.value })}
                options={[
                  { value: 'ALLOWANCE', label: 'Additional Allowance' },
                  { value: 'BONUS', label: 'Performance Bonus' },
                  { value: 'DEDUCTION', label: 'Deduction / Recovery' },
                  { value: 'OVERTIME', label: 'Approved Overtime' },
                  { value: 'OTHER', label: 'Other Adjustment' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Amount (₹)
              </label>
              <OwnInput
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={adjustParams.amount}
                onChange={(e) => setAdjustParams({ ...adjustParams, amount: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
              Item Name / Description
            </label>
            <OwnInput
              type="text"
              required
              placeholder="e.g. Festival Bonus, Transport Adjustment"
              value={adjustParams.name}
              onChange={(e) => setAdjustParams({ ...adjustParams, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
              Reason (Required Audit Trail)
            </label>
            <OwnInput
              type="text"
              required
              placeholder="Reason for adjustment before finalization..."
              value={adjustParams.reason}
              onChange={(e) => setAdjustParams({ ...adjustParams, reason: e.target.value })}
            />
          </div>

          <OwnDialogFooter className="mt-6">
            <OwnButton
              type="button"
              variant="outline"
              onClick={() => setShowAdjustModal(false)}
            >
              Cancel
            </OwnButton>
            <OwnButton
              type="submit"
              variant="primary"
              loading={adjusting}
            >
              Apply Adjustment
            </OwnButton>
          </OwnDialogFooter>
        </form>
      </OwnDialog>

      {/* Attendance & Salary Exceptions Review Modal */}
      <OwnDialog
        open={showExceptionsModal}
        onOpenChange={setShowExceptionsModal}
        title="Attendance & Salary Exceptions"
        description={
          selectedExceptionsRun
            ? `Review policy-driven exceptions for period ${selectedExceptionsRun.period_start} → ${selectedExceptionsRun.period_end}. During the open editing window, managers can approve, waive, or adjust proposed deductions/additions.`
            : 'Review attendance exceptions'
        }
      >
        <div className="space-y-4 text-sm mt-2 max-w-4xl w-full">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2.5 rounded-lg border border-border">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Filter by Type
              </label>
              <OwnSelect
                value={exceptionTypeFilter}
                onChange={(e) => setExceptionTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Exception Types' },
                  { value: 'ABSENT', label: 'Absence (Missing / Unmarked)' },
                  { value: 'LATE', label: 'Late Arrival' },
                  { value: 'HALF_DAY', label: 'Half-Day Attendance' },
                  { value: 'HOLIDAY_WORK', label: 'Public Holiday Work' },
                  { value: 'WEEK_OFF_WORK', label: 'Weekly Off Work' },
                  { value: 'UNPAID_LEAVE', label: 'Unpaid Leave' },
                  { value: 'PENDING_LEAVE', label: 'Unresolved Pending Leave' },
                ]}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Filter by Review Status
              </label>
              <OwnSelect
                value={exceptionStatusFilter}
                onChange={(e) => setExceptionStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Review States' },
                  { value: 'AWAITING_REVIEW', label: 'Awaiting Review' },
                  { value: 'CALCULATED', label: 'Calculated (Default Applied)' },
                  { value: 'APPROVED', label: 'Approved by Manager' },
                  { value: 'WAIVED', label: 'Waived by Manager' },
                  { value: 'REJECTED', label: 'Rejected by Manager' },
                ]}
              />
            </div>
          </div>

          {/* Exceptions Table / List */}
          {loadingExceptions ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs">
              Loading policy exceptions...
            </div>
          ) : exceptions.length === 0 ? (
            <OwnEmptyState
              title="No Exceptions Found"
              description="No attendance exceptions match the selected filters for this payroll run."
            />
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg max-h-96">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-[10px] uppercase font-semibold text-muted-foreground border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Date & Hours</th>
                    <th className="px-3 py-2.5">Exception & Reason</th>
                    <th className="px-3 py-2.5">Proposed Amount</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-muted/30 transition">
                      <td className="px-3 py-2 font-medium">
                        <div>{exc.employee_name}</div>
                        {exc.employee_id_code && (
                          <div className="text-[10px] font-mono text-muted-foreground">{exc.employee_id_code}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        <div>{exc.attendance_date}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Sched: {exc.scheduled_hours}h {exc.actual_hours !== null && exc.actual_hours !== undefined ? `| Act: ${exc.actual_hours}h` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-[11px] text-foreground">{exc.exception_type_display}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-xs">{exc.exception_reason}</div>
                        {exc.decision_reason && (
                          <div className="text-[9px] text-primary italic font-mono mt-0.5">Audit: {exc.decision_reason}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold">
                        {exc.is_deduction ? (
                          <span className="text-destructive">
                            -₹{Number(exc.decision_amount ?? exc.proposed_amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +₹{Number(exc.decision_amount ?? exc.proposed_amount).toFixed(2)}
                          </span>
                        )}
                        <div className="text-[9px] text-muted-foreground">
                          {exc.is_applied_to_payroll ? 'Applied to Net' : 'Not Applied'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                            exc.review_status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                              : exc.review_status === 'WAIVED'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200'
                              : exc.review_status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                              : exc.review_status === 'AWAITING_REVIEW'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {exc.review_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {selectedExceptionsRun?.is_editing_open && (
                          <div className="flex items-center justify-end gap-1">
                            {exc.is_deduction ? (
                              <>
                                <OwnButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleInitiateReview(exc, 'WAIVE')}
                                  className="text-[10px] h-6 px-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50"
                                >
                                  Waive
                                </OwnButton>
                                <OwnButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleInitiateReview(exc, 'ADJUST_AMOUNT')}
                                  className="text-[10px] h-6 px-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50"
                                >
                                  Adjust
                                </OwnButton>
                                {exc.review_status !== 'APPROVED' && (
                                  <OwnButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleInitiateReview(exc, 'APPROVE')}
                                    className="text-[10px] h-6 px-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
                                  >
                                    Approve
                                  </OwnButton>
                                )}
                              </>
                            ) : (
                              <>
                                <OwnButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleInitiateReview(exc, 'APPROVE')}
                                  className="text-[10px] h-6 px-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
                                >
                                  Approve
                                </OwnButton>
                                <OwnButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleInitiateReview(exc, 'ADJUST_AMOUNT')}
                                  className="text-[10px] h-6 px-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50"
                                >
                                  Adjust
                                </OwnButton>
                                <OwnButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleInitiateReview(exc, 'REJECT')}
                                  className="text-[10px] h-6 px-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50"
                                >
                                  Reject
                                </OwnButton>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <OwnDialogFooter className="mt-4">
            <OwnButton variant="outline" onClick={() => setShowExceptionsModal(false)}>
              Close
            </OwnButton>
          </OwnDialogFooter>
        </div>
      </OwnDialog>

      {/* Review Decision Prompt Modal */}
      <OwnDialog
        open={showReviewPrompt}
        onOpenChange={setShowReviewPrompt}
        title={`Apply Exception Decision: ${reviewAction}`}
        description={
          activeException
            ? `Review decision for ${activeException.employee_name} on ${activeException.attendance_date}. A mandatory audit reason will be logged.`
            : 'Review exception decision'
        }
      >
        <form onSubmit={handleSubmitReviewDecision} className="space-y-4 text-sm mt-2">
          {reviewAction === 'ADJUST_AMOUNT' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                New Decision Amount (₹)
              </label>
              <OwnInput
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={reviewAmount}
                onChange={(e) => setReviewAmount(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
              Audit Reason (Mandatory)
            </label>
            <OwnInput
              type="text"
              required
              placeholder="e.g. Approved medical certificate, emergency delay waived..."
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
            />
          </div>

          <OwnDialogFooter className="mt-6">
            <OwnButton type="button" variant="outline" onClick={() => setShowReviewPrompt(false)}>
              Cancel
            </OwnButton>
            <OwnButton type="submit" variant="primary" loading={submittingReview}>
              Confirm Decision
            </OwnButton>
          </OwnDialogFooter>
        </form>
      </OwnDialog>
    </div>
  )
}

