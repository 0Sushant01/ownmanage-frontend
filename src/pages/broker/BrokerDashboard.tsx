import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  OwnCard,
  OwnKpiCard,
  OwnBadge,
  OwnButton,
  OwnPageHeader,
} from '../../design-system'
import { Building2, Users, DollarSign, Clock, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react'

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
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error || 'Unable to retrieve broker dashboard data.'}</span>
        </div>
      </div>
    )
  }

  const { broker, metrics, referrals, recent_commissions } = data

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <OwnPageHeader
        title={broker.name || user?.full_name || 'Partner Dashboard'}
        badge={
          <div className="flex items-center space-x-2">
            <OwnBadge variant="warning" size="sm">
              Platform Partner
            </OwnBadge>
            <span className="text-xs text-muted-foreground font-mono">Commission Rate: {broker.commission_rate}%</span>
          </div>
        }
        description="Referral revenue, client subscriptions, and commission settlements."
        actions={
          <div className="flex items-center space-x-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Your Referral Code
              </span>
              <span className="font-mono text-base font-bold text-primary">{broker.referral_code}</span>
            </div>
            <OwnButton
              onClick={copyReferralCode}
              size="sm"
              variant={copied ? 'secondary' : 'primary'}
              leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy Code'}
            </OwnButton>
          </div>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OwnKpiCard
          title="Referred Enterprises"
          value={metrics.total_referred_businesses}
          subtitle={`${metrics.active_businesses} active client enterprises`}
          icon={<Building2 className="w-4 h-4" />}
          variant="default"
        />

        <OwnKpiCard
          title="Total Client Employees"
          value={metrics.total_referred_employees}
          subtitle="Active users across referred centres"
          icon={<Users className="w-4 h-4" />}
          variant="info"
        />

        <OwnKpiCard
          title="Total Commission Earned"
          value={`₹${metrics.commission.total_earned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Cumulative revenue from referrals"
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />

        <OwnKpiCard
          title="Pending / In Review"
          value={`₹${metrics.commission.pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`Approved: ₹${metrics.commission.approved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={<Clock className="w-4 h-4" />}
          variant="warning"
        />
      </div>

      {/* Plan Breakdown & Distribution */}
      {Object.keys(metrics.plan_breakdown || {}).length > 0 && (
        <OwnCard className="p-5 sm:p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Referred Enterprises by Subscription Tier
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(metrics.plan_breakdown).map(([tier, count]) => (
              <div key={tier} className="rounded-xl border border-border bg-muted/40 p-4">
                <span className="text-xs text-muted-foreground block font-mono">{tier}</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">{count}</span>
                <span className="text-[11px] text-muted-foreground">Enterprises</span>
              </div>
            ))}
          </div>
        </OwnCard>
      )}

      {/* Two Column Tables: Recent Referrals & Recent Commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referred Enterprises */}
        <OwnCard className="overflow-hidden border-border bg-card">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Referred Enterprises</span>
            </h2>
            <span className="text-xs text-muted-foreground font-mono">{referrals.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            {referrals.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No enterprises referred yet. Share your code <span className="font-mono text-primary font-bold">{broker.referral_code}</span> to start earning!
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Enterprise</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Employees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-muted/30 transition">
                      <td className="p-3.5 font-medium">{ref.business_name}</td>
                      <td className="p-3.5">
                        <OwnBadge variant="outline" size="sm">
                          {ref.plan_name}
                        </OwnBadge>
                      </td>
                      <td className="p-3.5">
                        <OwnBadge
                          variant={ref.subscription_status === 'ACTIVE' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {ref.subscription_status}
                        </OwnBadge>
                      </td>
                      <td className="p-3.5 font-mono text-muted-foreground">{ref.active_employees_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </OwnCard>

        {/* Commission Records */}
        <OwnCard className="overflow-hidden border-border bg-card">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span>Recent Commission Statements</span>
            </h2>
            <span className="text-xs text-muted-foreground font-mono">{recent_commissions.length} Statements</span>
          </div>
          <div className="overflow-x-auto">
            {recent_commissions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No commission cycles generated yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Enterprise</th>
                    <th className="p-3.5">Period</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {recent_commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition">
                      <td className="p-3.5 font-medium">{c.business_name}</td>
                      <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                        {c.period_start} – {c.period_end}
                      </td>
                      <td className="p-3.5 font-bold text-primary font-mono">
                        ₹{parseFloat(c.commission_amount).toFixed(2)}
                      </td>
                      <td className="p-3.5">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </OwnCard>
      </div>
    </div>
  )
}

export default BrokerDashboard
