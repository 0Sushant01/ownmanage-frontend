import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Payroll } from '../types'

export const Salary: React.FC = () => {
  const { role } = useAuth()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [periodStart, setPeriodStart] = useState('')

  // Payslip Modal
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)

  const loadPayrolls = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (periodStart) params.period_start = periodStart

      const res = await apiClient.get('/salary/payrolls/', { params })
      setPayrolls(res.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payroll records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayrolls()
  }, [statusFilter, periodStart])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
      case 'PROCESSED':
        return 'bg-blue-950/80 text-blue-400 border-blue-800/80'
      case 'DRAFT':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80'
      case 'CANCELLED':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80'
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700'
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payroll & Salary Records</h1>
          <p className="text-sm text-slate-400 mt-1">
            {role === 'STAFF'
              ? 'View your generated payslips and compensation breakdowns.'
              : 'Review organization payroll distributions and employee payslips.'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PROCESSED">Processed</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Period Start:</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {(statusFilter || periodStart) && (
          <button
            onClick={() => {
              setStatusFilter('')
              setPeriodStart('')
            }}
            className="text-xs text-slate-400 hover:text-white underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Payroll Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
            <p className="text-sm">Fetching payroll records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">{error}</div>
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">💳</span>
            <p className="text-base font-semibold text-slate-300">No payroll records found</p>
            <p className="text-xs text-slate-500 mt-1">
              Generated payroll records and payslips will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Gross</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Salary</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payrolls.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{pay.employee_name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {pay.employee_id_code || 'ID: --'} {pay.department_name ? `• ${pay.department_name}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-300">
                      {pay.period_start} → {pay.period_end}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-300">
                      {pay.currency} {Number(pay.gross_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-rose-400">
                      -{pay.currency} {Number(pay.total_deductions).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-emerald-400">
                      {pay.currency} {Number(pay.net_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(pay.status)}`}>
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedPayroll(pay)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        View Payslip →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip View Modal */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Official Payslip</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedPayroll.employee_name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedPayroll.employee_id_code} {selectedPayroll.department_name ? `• ${selectedPayroll.department_name}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Payslip Details Box */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-3">
                <span>Pay Period:</span>
                <span className="font-mono text-white font-medium">
                  {selectedPayroll.period_start} to {selectedPayroll.period_end}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Earnings</span>
                  <span className="font-mono text-white font-semibold">
                    {selectedPayroll.currency} {Number(selectedPayroll.gross_amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Standard Deductions</span>
                  <span className="font-mono text-rose-400">
                    -{selectedPayroll.currency} {Number(selectedPayroll.total_deductions).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-white uppercase tracking-wider">Net Amount Payable</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  {selectedPayroll.currency} {Number(selectedPayroll.net_amount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>Status: <strong className="text-slate-300">{selectedPayroll.status}</strong></span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Salary
