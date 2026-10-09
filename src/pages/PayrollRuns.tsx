import React, { useState, useEffect } from 'react'
import { Zap, CreditCard, Lock, CheckCircle2 } from 'lucide-react'
import apiClient from '../services/api'
import { Can } from '../components/Can'
import { CentreSelector } from '../components/CentreSelector'
import type { PayrollRun } from '../types'
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
  const [loading, setLoading] = useState<boolean>(true)
  const [showCalculateModal, setShowCalculateModal] = useState<boolean>(false)

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
  }, [selectedCentre])

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
    if (!window.confirm('Finalize & lock this payroll run? This will mark payslips as final and cannot be undone.')) return
    setActionLoadingId(runId)
    setError(null)
    try {
      await apiClient.post(`/payroll/runs/${runId}/finalize/`, {})
      setSuccessMsg('Payroll run finalized & locked!')
      await loadPayrollRuns()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to finalize payroll run.')
    } finally {
      setActionLoadingId(null)
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

      {/* Filter bar with Centre selector */}
      <OwnFilterBar>
        <div className="w-72">
          <CentreSelector
            value={selectedCentre}
            onChange={(val: string) => setSelectedCentre(val)}
            allowAll={true}
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

                <div className="flex items-center justify-end gap-2 pt-1">
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
                    <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 py-1">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Payroll Finalized & Locked</span>
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
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Lock className="w-3 h-3 text-muted-foreground" />
                            <span>Locked</span>
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
    </div>
  )
}
