import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import { useAuth } from '../../context/AuthContext'

interface BrokerDashboardData {
  broker: {
    id: string
    name: string
    referral_code: string
    commission_rate: number
  }
  metrics: {
    total_referred_businesses: number
    active_businesses: number
    trial_businesses: number
    total_referred_employees: number
    plan_breakdown: Record<string, number>
    commission: {
      total_earned: number
      pending: number
      approved: number
      available: number
    }
  }
  referrals: Array<{
    id: string
    business_id: string
    business_name: string
    referred_at: string
    plan_name: string
    subscription_status: string
    active_employees_count: number
  }>
  recent_commissions: Array<{
    id: string
    business_name: string
    period_start: string
    period_end: string
    base_revenue: string
    commission_rate: string
    commission_amount: string
    status: string
    paid_at: string | null
    created_at: string
  }>
}

export const BrokerDashboard: React.FC = () => {
  const { user } = useAuth()
  const [data, setData] = useState<BrokerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/brokers/dashboard/')
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load broker metrics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const copyReferralCode = () => {
    if (!data?.broker?.referral_code) return
    navigator.clipboard.writeText(data.broker.referral_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
          {error || 'Unable to retrieve broker dashboard data.'}
        </div>
      </div>
    )
  }

  const { broker, metrics, referrals, recent_commissions } = data

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
              Platform Partner
            </span>
            <span className="text-xs text-slate-500">Commission Rate: {broker.commission_rate}%</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white lg:text-3xl">
            {broker.name || user?.full_name}
          </h1>
          <p className="text-sm text-slate-400">
            Referral revenue, client subscriptions, and commission settlements.
          </p>
        </div>

        {/* Referral Code Share Box */}
        <div className="flex items-center space-x-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg">
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Your Referral Code
            </span>
            <span className="font-mono text-base font-bold text-amber-400">{broker.referral_code}</span>
          </div>
          <button
            onClick={copyReferralCode}
            className="flex items-center space-x-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition shadow-md shadow-amber-500/10"
          >
            <span>{copied ? '✓ Copied' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Referred Enterprises
            </span>
            <span className="text-lg">🏢</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{metrics.total_referred_businesses}</span>
            <span className="text-xs text-emerald-400 font-medium">
              {metrics.active_businesses} active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Total client businesses registered</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Client Employees
            </span>
            <span className="text-lg">👥</span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{metrics.total_referred_employees}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Active users across all referred centres</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Commission Earned
            </span>
            <span className="text-lg">💰</span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-400">
              ₹{metrics.commission.total_earned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Cumulative revenue from referrals</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Pending / In Review
            </span>
            <span className="text-lg">⏳</span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-400">
              ₹{metrics.commission.pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Approved: ₹{metrics.commission.approved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Plan Breakdown & Distribution */}
      {Object.keys(metrics.plan_breakdown || {}).length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Referred Enterprises by Subscription Tier
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(metrics.plan_breakdown).map(([tier, count]) => (
              <div key={tier} className="rounded-xl border border-slate-800/80 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 block font-mono">{tier}</span>
                <span className="text-2xl font-bold text-white mt-1 block">{count}</span>
                <span className="text-[11px] text-slate-500">Enterprises</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Tables: Recent Referrals & Recent Commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Referred Enterprises */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>🏢</span>
              <span>Referred Enterprises</span>
            </h2>
            <span className="text-xs text-slate-500">{referrals.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            {referrals.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No enterprises referred yet. Share your code <span className="font-mono text-amber-400">{broker.referral_code}</span> to start earning!
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Enterprise</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Employees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-medium text-white">{ref.business_name}</td>
                      <td className="p-3.5">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                          {ref.plan_name}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            ref.subscription_status === 'ACTIVE'
                              ? 'bg-emerald-900/40 text-emerald-400'
                              : 'bg-amber-900/40 text-amber-400'
                          }`}
                        >
                          {ref.subscription_status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">{ref.active_employees_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Commission Records */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>💳</span>
              <span>Recent Commission Statements</span>
            </h2>
            <span className="text-xs text-slate-500">{recent_commissions.length} Statements</span>
          </div>
          <div className="overflow-x-auto">
            {recent_commissions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No commission cycles generated yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Enterprise</th>
                    <th className="p-3.5">Period</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {recent_commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-medium text-white">{c.business_name}</td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                        {c.period_start} – {c.period_end}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-400 font-mono">
                        ₹{parseFloat(c.commission_amount).toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
