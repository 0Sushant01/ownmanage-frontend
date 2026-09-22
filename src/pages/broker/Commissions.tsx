import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import type { Commission } from '../../types'

export const Commissions: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const fetchCommissions = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/commissions/')
      setCommissions(res.data?.results || res.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load commissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommissions()
  }, [])

  const filtered = commissions.filter((c) =>
    statusFilter === 'ALL' ? true : c.status === statusFilter
  )

  const totalEarned = commissions.reduce(
    (sum, c) => sum + (c.status === 'PAID' ? parseFloat(c.commission_amount) : 0),
    0
  )
  const totalPending = commissions.reduce(
    (sum, c) => sum + (c.status === 'PENDING' || c.status === 'APPROVED' ? parseFloat(c.commission_amount) : 0),
    0
  )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Commission Ledger
          </h1>
          <p className="text-sm text-slate-400">
            Immutable settlement cycles and payout records per billing period.
          </p>
        </div>

        <div className="flex space-x-2">
          {['ALL', 'PENDING', 'APPROVED', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Settled & Paid</span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-400">
            ₹{totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500">Credited to partner bank account</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Pending Settlement</span>
          <div className="mt-2 text-3xl font-extrabold text-amber-400">
            ₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500">Upcoming disbursement cycle</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Cycles</span>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {commissions.length}
          </div>
          <span className="text-xs text-slate-500">Lifetime monthly billing periods</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No commission statements found matching current filter.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-xs">
                <tr>
                  <th className="p-4">Enterprise</th>
                  <th className="p-4">Billing Period</th>
                  <th className="p-4">Base Subscription</th>
                  <th className="p-4">Commission Rate</th>
                  <th className="p-4">Payout Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payout Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-semibold text-white">{c.business_name || 'Enterprise'}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">
                      {c.period_start} – {c.period_end}
                    </td>
                    <td className="p-4 font-mono">₹{parseFloat(c.base_revenue).toFixed(2)}</td>
                    <td className="p-4 font-mono text-amber-400">{c.commission_rate}%</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      ₹{parseFloat(c.commission_amount).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          c.status === 'PAID'
                            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                            : c.status === 'APPROVED'
                            ? 'bg-blue-900/40 text-blue-400 border border-blue-700/50'
                            : 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-400">
                      {c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
