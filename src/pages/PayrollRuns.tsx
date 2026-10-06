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

  const [calcParams, setCalcParams] = useState({
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    centre_id: '',
  })

  const [calculating, setCalculating] = useState<boolean>(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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
        <OwnCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Pay Period</th>
                  <th className="px-6 py-4">Scope</th>
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
                      {r.period_start} → {r.period_end}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">
                        {r.centre_name ? `Centre: ${r.centre_name}` : 'All Enterprise Centres'}
                      </span>
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
