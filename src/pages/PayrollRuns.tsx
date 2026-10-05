import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import { Can } from '../components/Can'
import { CentreSelector } from '../components/CentreSelector'
import type { PayrollRun } from '../types'

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINALIZED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800'
      case 'APPROVED':
        return 'bg-blue-950 text-blue-300 border-blue-800'
      case 'REVIEWED':
        return 'bg-purple-950 text-purple-300 border-purple-800'
      case 'CALCULATED':
        return 'bg-amber-950 text-amber-300 border-amber-800'
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payroll Processing</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Batched payroll cycle: Calculate → Review → Approve → Finalize
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CentreSelector
            value={selectedCentre}
            onChange={(val: string) => setSelectedCentre(val)}
            showAllOption={true}
          />

          <Can permission="payroll.calculate">
            <button
              onClick={() => setShowCalculateModal(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
            >
              ⚡ Run Batch Payroll
            </button>
          </Can>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-sm">
          {successMsg}
        </div>
      )}

      {/* Payroll Runs Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
          <span className="text-4xl block mb-2">💳</span>
          <h3 className="text-lg font-semibold text-white">No Payroll Runs Initiated</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Click "Run Batch Payroll" to calculate salaries, overtime, and leave deductions for the current pay period.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-850/40 transition">
                  <td className="px-6 py-4 font-mono font-medium text-white">
                    {r.period_start} → {r.period_end}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-300">
                      {r.centre_name ? `Center: ${r.centre_name}` : 'All Enterprise Centers'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(r.status)}`}>
                      {r.status_display || r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{r.total_employees}</td>
                  <td className="px-6 py-4 font-mono text-slate-300">
                    ₹{Number(r.total_gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-mono text-red-400">
                    -₹{Number(r.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                    ₹{Number(r.total_net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === 'CALCULATED' && (
                        <Can permission="payroll.approve">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actionLoadingId === r.id}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 transition"
                          >
                            Approve
                          </button>
                        </Can>
                      )}

                      {r.status === 'APPROVED' && (
                        <Can permission="payroll.finalize">
                          <button
                            onClick={() => handleFinalize(r.id)}
                            disabled={actionLoadingId === r.id}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition"
                          >
                            Finalize & Lock
                          </button>
                        </Can>
                      )}

                      {r.status === 'FINALIZED' && (
                        <span className="text-xs text-slate-500 font-mono">🔒 Locked</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Run Calculation Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Batch Payroll Calculation</h3>
              <button
                onClick={() => setShowCalculateModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRunCalculation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={calcParams.period_start}
                    onChange={(e) => setCalcParams({ ...calcParams, period_start: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={calcParams.period_end}
                    onChange={(e) => setCalcParams({ ...calcParams, period_end: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Center Scope (Optional)</label>
                <select
                  value={calcParams.centre_id}
                  onChange={(e) => setCalcParams({ ...calcParams, centre_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Enterprise Centers</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave empty to process all active employees across the entire Enterprise.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCalculateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calculating}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition disabled:opacity-50"
                >
                  {calculating ? 'Calculating Payroll...' : 'Calculate Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
