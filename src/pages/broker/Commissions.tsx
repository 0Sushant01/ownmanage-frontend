import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import type { Commission } from '../../types'
import {
  OwnCard,
  OwnKpiCard,
  OwnBadge,
  OwnPageHeader,
} from '../../design-system'
import { DollarSign, Clock, Layers, RefreshCw, AlertTriangle } from 'lucide-react'

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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <OwnPageHeader
          title="Commission Ledger"
          description="Immutable settlement cycles and payout records per billing period."
        />

        <div className="flex space-x-2">
          {['ALL', 'PENDING', 'APPROVED', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <OwnKpiCard
          title="Settled & Paid"
          value={`₹${totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Credited to partner bank account"
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />

        <OwnKpiCard
          title="Pending Settlement"
          value={`₹${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Upcoming disbursement cycle"
          icon={<Clock className="w-4 h-4" />}
          variant="warning"
        />

        <OwnKpiCard
          title="Total Cycles"
          value={commissions.length}
          subtitle="Lifetime monthly billing periods"
          icon={<Layers className="w-4 h-4" />}
          variant="default"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <OwnCard className="overflow-hidden border-border bg-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No commission statements found matching current filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3.5 sm:p-4">Enterprise</th>
                  <th className="p-3.5 sm:p-4">Billing Period</th>
                  <th className="p-3.5 sm:p-4">Base Subscription</th>
                  <th className="p-3.5 sm:p-4">Commission Rate</th>
                  <th className="p-3.5 sm:p-4">Payout Amount</th>
                  <th className="p-3.5 sm:p-4">Status</th>
                  <th className="p-3.5 sm:p-4">Payout Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition">
                    <td className="p-3.5 sm:p-4 font-semibold">{c.business_name || 'Enterprise'}</td>
                    <td className="p-3.5 sm:p-4 font-mono text-xs text-muted-foreground">
                      {c.period_start} – {c.period_end}
                    </td>
                    <td className="p-3.5 sm:p-4 font-mono">₹{parseFloat(c.base_revenue).toFixed(2)}</td>
                    <td className="p-3.5 sm:p-4 font-mono font-medium text-warning">{c.commission_rate}%</td>
                    <td className="p-3.5 sm:p-4 font-mono font-bold text-primary">
                      ₹{parseFloat(c.commission_amount).toFixed(2)}
                    </td>
                    <td className="p-3.5 sm:p-4">
                      <OwnBadge
                        variant={
                          c.status === 'PAID'
                            ? 'success'
                            : c.status === 'APPROVED'
                            ? 'primary'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {c.status}
                      </OwnBadge>
                    </td>
                    <td className="p-3.5 sm:p-4 font-mono text-xs text-muted-foreground">
                      {c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </OwnCard>
    </div>
  )
}

export default Commissions
