import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../services/api'
import type { Business, Plan, Subscription } from '../types'
import {
  OwnCard,
  OwnKpiCard,
  OwnBadge,
  OwnButton,
  OwnPageHeader,
} from '../design-system'
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  CreditCard,
  ArrowLeft,
  X,
  AlertTriangle,
  UserPlus,
  FileText,
} from 'lucide-react'

interface CentreAllocationItem {
  id: string
  name: string
  code: string
  allocated_capacity: number
  active_employees_count: number
}

interface SubscriptionHistoryRecord {
  id: string
  plan_name: string
  action: string
  monthly_charge: string
  max_centres: number
  total_employee_capacity: number
  effective_from: string
  effective_to?: string
  reason: string
  created_at: string
}

export const BusinessDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [centres, setCentres] = useState<CentreAllocationItem[]>([])
  const [history, setHistory] = useState<SubscriptionHistoryRecord[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminCreating, setAdminCreating] = useState(false)
  const [adminData, setAdminData] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' })
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [planReason, setPlanReason] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)
  const [renewingSub, setRenewingSub] = useState(false)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Reallocate Capacity State
  const [selectedCentreForAlloc, setSelectedCentreForAlloc] = useState<CentreAllocationItem | null>(null)
  const [newAllocCapacity, setNewAllocCapacity] = useState<number>(0)
  const [savingAlloc, setSavingAlloc] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [bizRes, statsRes, plansRes] = await Promise.all([
        apiClient.get(`/businesses/${id}/`),
        apiClient.get(`/businesses/${id}/stats/`),
        apiClient.get('/plans/'),
      ])
      setBusiness(bizRes.data)
      setStats(statsRes.data)
      setPlans(plansRes.data?.results || plansRes.data || [])

      // Fetch subscription details
      try {
        const subRes = await apiClient.get('/subscriptions/', { params: { business_id: id } })
        setSubscription(subRes.data)
        const activePlanId =
          subRes.data?.plan?.id ||
          (typeof subRes.data?.plan === 'string' ? subRes.data.plan : '') ||
          subRes.data?.plan_id ||
          ''
        if (activePlanId) {
          setSelectedPlanId(activePlanId)
        }
      } catch {
        setSubscription(null)
      }

      // Fetch centres with capacity
      try {
        const centresRes = await apiClient.get(`/businesses/${id}/centres/`)
        setCentres(centresRes.data || [])
      } catch {
        setCentres([])
      }

      // Fetch subscription history
      try {
        const histRes = await apiClient.get(`/businesses/${id}/subscription-history/`)
        setHistory(histRes.data || [])
      } catch {
        setHistory([])
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load business details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleToggleStatus = async () => {
    if (!business) return
    setUpdatingStatus(true)
    try {
      const res = await apiClient.patch(`/businesses/${id}/`, {
        is_active: !business.is_active,
      })
      setBusiness(res.data)
      setShowStatusModal(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update business status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminCreating(true)
    setAdminSuccess(null)
    try {
      const res = await apiClient.post(`/businesses/${id}/create-admin/`, adminData)
      setAdminSuccess(res.data.detail || 'Business Admin created successfully!')
      setAdminData({ first_name: '', last_name: '', email: '', phone: '', password: '' })
      setTimeout(() => setShowAdminModal(false), 2000)
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to create business admin.')
    } finally {
      setAdminCreating(false)
    }
  }

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanId) return
    setSavingPlan(true)
    try {
      await apiClient.post('/subscriptions/', {
        business_id: id,
        plan_id: selectedPlanId,
        reason: planReason || 'Administrative plan modification by SuperAdmin',
      })
      setShowChangePlanModal(false)
      setPlanReason('')
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to change subscription plan.')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCentreForAlloc) return
    setSavingAlloc(true)
    try {
      await apiClient.post('/subscriptions/reallocate-capacity/', {
        centre_id: selectedCentreForAlloc.id,
        allocated_capacity: newAllocCapacity,
      })
      setSelectedCentreForAlloc(null)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to allocate centre capacity.')
    } finally {
      setSavingAlloc(false)
    }
  }

  const handleRenewSubscription = async () => {
    if (!subscription) return
    setRenewingSub(true)
    try {
      await apiClient.post('/subscriptions/', {
        business_id: id,
        action: 'renew',
        reason: 'SuperAdmin administrative 30-day renewal',
      })
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to renew subscription.')
    } finally {
      setRenewingSub(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-2xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error || 'Business not found'}</span>
        </div>
        <Link to="/businesses" className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
      </div>
    )
  }

  const currentPlan = (typeof subscription?.plan === 'object' && subscription?.plan) ? subscription.plan : null
  const planName = currentPlan?.name || (subscription as any)?.plan_name || 'No Plan'
  const planMonthlyCharge = currentPlan?.monthly_charge ?? (subscription as any)?.monthly_charge ?? '0'
  const planTotalCapacity = currentPlan?.total_employee_capacity ?? (subscription as any)?.total_employee_capacity ?? 0
  const daysLeft = subscription?.days_remaining ?? business.days_remaining ?? 0
  const daysBadgeVariant: 'danger' | 'warning' | 'default' =
    daysLeft <= 3 ? 'danger' : daysLeft <= 7 ? 'warning' : 'default'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* 1. Header with Name & Primary Actions */}
      <div className="space-y-2">
        <Link
          to="/businesses"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </Link>

        <OwnPageHeader
          title={business.name}
          badge={
            <OwnBadge variant={business.is_active ? 'success' : 'danger'} size="sm">
              {business.is_active ? 'Active Tenant' : 'Deactivated'}
            </OwnBadge>
          }
          description={`Tenant UUID: ${business.id}`}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <OwnButton
                onClick={() => setShowChangePlanModal(true)}
                variant="outline"
                size="sm"
              >
                Change Plan
              </OwnButton>
              <OwnButton
                onClick={() => setShowStatusModal(true)}
                variant={business.is_active ? 'destructive' : 'primary'}
                size="sm"
              >
                {business.is_active ? 'Deactivate' : 'Reactivate'}
              </OwnButton>
              <OwnButton
                onClick={() => setShowAdminModal(true)}
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                + Add Admin
              </OwnButton>
            </div>
          }
        />
      </div>

      {/* 2. Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OwnKpiCard
          title="Total Staff"
          value={stats?.total_employees ?? 0}
          subtitle="Registered profiles"
          icon={<Users className="w-4 h-4" />}
          variant="default"
        />
        <OwnKpiCard
          title="Present Today"
          value={stats?.present_today ?? 0}
          subtitle="Checked in today"
          icon={<CheckCircle2 className="w-4 h-4" />}
          variant="success"
        />
        <OwnKpiCard
          title="Absent Today"
          value={stats?.absent_today ?? 0}
          subtitle="Unrecorded"
          icon={<Clock className="w-4 h-4" />}
          variant="warning"
        />
        <OwnKpiCard
          title="On Leave"
          value={stats?.on_leave ?? 0}
          subtitle="Approved leaves"
          icon={<Clock className="w-4 h-4" />}
          variant="info"
        />
      </div>

      {/* 3. Subscription & Billing Status */}
      <OwnCard className="p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Subscription & Billing Status
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authoritative commercial entitlement and billing provenance.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {subscription && (daysLeft <= 7 || subscription.status !== 'ACTIVE') && (
              <OwnButton
                size="xs"
                variant="secondary"
                disabled={renewingSub}
                onClick={handleRenewSubscription}
              >
                {renewingSub ? 'Renewing...' : '⚡ Renew (+30d)'}
              </OwnButton>
            )}
            <button
              onClick={() => setShowChangePlanModal(true)}
              className="text-xs text-primary hover:underline font-semibold text-left sm:text-right cursor-pointer"
            >
              Upgrade / Downgrade Plan →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
            <span className="text-muted-foreground block mb-1 text-[11px] font-medium">Current Plan</span>
            <span className="text-sm sm:text-base font-bold text-foreground">{planName}</span>
            <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
              ₹{parseFloat(planMonthlyCharge || '0').toFixed(0)} / month
            </span>
          </div>

          <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
            <span className="text-muted-foreground block mb-1 text-[11px] font-medium">Subscription Status</span>
            <div className="mt-1">
              <OwnBadge variant={subscription?.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                {subscription?.status || 'INACTIVE'}
              </OwnBadge>
            </div>
            <span className="text-[10px] text-muted-foreground block font-mono mt-1">
              Started {subscription?.start_date || '—'}
            </span>
          </div>

          <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
            <span className="text-muted-foreground block mb-1 text-[11px] font-medium">Current Period Expiry</span>
            <span className="text-xs sm:text-sm font-bold text-foreground block font-mono">
              {subscription?.current_period_end || '—'}
            </span>
            <div className="mt-1">
              <OwnBadge variant={daysBadgeVariant} size="sm">
                {daysLeft < 0
                  ? `Expired ${Math.abs(daysLeft)}d ago`
                  : daysLeft <= 7
                  ? `Expires in ${daysLeft}d`
                  : `Active • ${daysLeft}d left`}
              </OwnBadge>
            </div>
          </div>

          <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
            <span className="text-muted-foreground block mb-1 text-[11px] font-medium">Payment Status</span>
            <div className="mt-1">
              <OwnBadge variant={subscription?.payment_status === 'PAID' ? 'success' : 'warning'} size="sm">
                {subscription?.payment_status || 'PAID'}
              </OwnBadge>
            </div>
            <span className="text-[10px] text-muted-foreground block font-mono mt-1">
              Last: ₹{subscription?.last_payment?.amount ? subscription.last_payment.amount.toLocaleString() : '—'}
            </span>
          </div>

          <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
            <span className="text-muted-foreground block mb-1 text-[11px] font-medium">Assigned Partner Broker</span>
            <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
              {subscription?.broker?.name || business.broker_name || 'Direct / Organic'}
            </span>
            <span className="text-[10px] text-muted-foreground block font-mono truncate">
              Code: {subscription?.broker?.referral_code || business.broker_code || 'None'}
            </span>
          </div>
        </div>
      </OwnCard>

      {/* 4. Flexible Centre Allocation */}
      <OwnCard className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Dynamic Centre Capacity Allocation
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribute total plan capacity ({planTotalCapacity} seats) across centres.
              Sum of centre allocations must not exceed plan limit.
            </p>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Total Allocated:{' '}
            <strong className="text-primary font-bold">
              {centres.reduce((sum, c) => sum + (c.allocated_capacity || 0), 0)}
            </strong>{' '}
            / {planTotalCapacity} seats
          </div>
        </div>

        {centres.length === 0 ? (
          <div className="p-6 bg-muted/30 rounded-xl border border-border text-center text-xs text-muted-foreground">
            No centres registered yet for this tenant.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centres.map((c) => {
              const allocated = c.allocated_capacity || 0
              const active = c.active_employees_count || 0
              const pct = allocated > 0 ? Math.min(100, Math.round((active / allocated) * 100)) : 0

              return (
                <div key={c.id} className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{c.name}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground">Code: {c.code}</span>
                    </div>
                    <OwnButton
                      onClick={() => {
                        setSelectedCentreForAlloc(c)
                        setNewAllocCapacity(allocated)
                      }}
                      size="xs"
                      variant="outline"
                    >
                      Adjust Capacity
                    </OwnButton>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Staff Usage:</span>
                      <span className="font-mono text-foreground">
                        <strong className="text-primary">{active}</strong> / {allocated} seats ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 90 ? 'bg-destructive' : pct >= 75 ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </OwnCard>

      {/* 5. Tenant Configuration */}
      <OwnCard className="p-5 sm:p-6 space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-foreground border-b border-border pb-3">
          Tenant Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block mb-1">Official Legal Name</span>
            <span className="text-foreground font-medium">{business.legal_name || 'Not provided'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Contact Email / Phone</span>
            <span className="text-foreground font-medium">
              {business.email || '—'} / {business.phone || '—'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Location</span>
            <span className="text-foreground font-medium">
              {business.city || '—'}, {business.state || '—'}, {business.country}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Timezone & Currency</span>
            <span className="text-foreground font-mono">
              {business.timezone} / {business.currency}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Employee ID Sequence</span>
            <span className="text-primary font-mono font-medium">
              {business.employee_id_enabled
                ? `Prefix: ${business.employee_id_prefix}, Next: #${business.employee_id_next_number}`
                : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Registration Date</span>
            <span className="text-muted-foreground font-mono">
              {new Date(business.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </OwnCard>

      {/* 6. Subscription History Section */}
      <OwnCard className="overflow-hidden border-border bg-card">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Subscription & Plan Change History
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanent immutable audit log of tier upgrades, renewals, and capacity changes.
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No historical plan modifications recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Effective Date</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Plan</th>
                  <th className="p-3.5">Monthly Charge</th>
                  <th className="p-3.5">Capacity</th>
                  <th className="p-3.5">Centres Cap</th>
                  <th className="p-3.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30 transition">
                    <td className="p-3.5 font-mono text-muted-foreground">{h.effective_from}</td>
                    <td className="p-3.5">
                      <OwnBadge variant="primary" size="sm">
                        {h.action}
                      </OwnBadge>
                    </td>
                    <td className="p-3.5 font-semibold">{h.plan_name}</td>
                    <td className="p-3.5 font-mono">₹{parseFloat(h.monthly_charge).toFixed(0)}</td>
                    <td className="p-3.5 font-mono text-primary font-medium">{h.total_employee_capacity} seats</td>
                    <td className="p-3.5 font-mono text-muted-foreground">{h.max_centres} branches</td>
                    <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                      {h.reason || 'Administrative change'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnCard>

      {/* Adjust Capacity Modal */}
      {selectedCentreForAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Adjust Centre Capacity</h3>
              <button
                onClick={() => setSelectedCentreForAlloc(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
              <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Centre:</span>
                  <strong className="text-foreground">{selectedCentreForAlloc.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Staff:</span>
                  <strong className="text-primary">{selectedCentreForAlloc.active_employees_count} employees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Pool in Plan:</span>
                  <strong className="text-foreground">
                    {subscription?.unallocated_capacity ?? 0} seats unallocated
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">
                  Allocated Capacity (seats) *
                </label>
                <input
                  type="number"
                  required
                  min={selectedCentreForAlloc.active_employees_count}
                  value={newAllocCapacity}
                  onChange={(e) => setNewAllocCapacity(Number(e.target.value))}
                  className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Cannot be lower than currently active employees ({selectedCentreForAlloc.active_employees_count}).
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <OwnButton
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCentreForAlloc(null)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  disabled={savingAlloc}
                  variant="primary"
                >
                  {savingAlloc ? 'Saving...' : 'Update Capacity'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Change Subscription Plan</h3>
              <button
                onClick={() => setShowChangePlanModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePlan} className="space-y-4 text-xs">
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Plan:</span>
                  <strong className="text-primary">{planName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Monthly Charge:</span>
                  <span className="font-mono text-foreground">
                    ₹{parseFloat(planMonthlyCharge || '0').toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Seat Capacity:</span>
                  <span className="font-mono text-foreground">
                    {planTotalCapacity} seats
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Select New Plan *</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{parseFloat(p.monthly_charge).toFixed(0)}/mo ({p.total_employee_capacity} seats, max {p.max_centres} centres)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Reason for Plan Change</label>
                <input
                  type="text"
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  placeholder="e.g. Enterprise expansion upgrade"
                  className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <OwnButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowChangePlanModal(false)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  disabled={savingPlan || !selectedPlanId}
                  variant="primary"
                >
                  {savingPlan ? 'Applying Plan...' : 'Confirm Plan Change'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {business.is_active ? '⚠️ Deactivate Business Tenant' : '✅ Reactivate Business Tenant'}
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-foreground space-y-2">
              <p>
                <strong>Business:</strong> {business.name}
              </p>
              {business.is_active ? (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
                  <strong>Warning:</strong> Deactivating this business prevents all administrators, managers, and employees from accessing the portal. Existing data and payroll history remain preserved.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success">
                  Reactivating this business will restore system access for all its users.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="outline"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="button"
                onClick={handleToggleStatus}
                disabled={updatingStatus}
                variant={business.is_active ? 'destructive' : 'primary'}
              >
                {updatingStatus ? 'Updating...' : business.is_active ? 'Yes, Deactivate' : 'Yes, Reactivate'}
              </OwnButton>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Create Business Administrator</h3>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adminSuccess && (
              <div className="bg-success/10 border border-success/30 text-success text-xs p-3 rounded-xl">
                {adminSuccess}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-foreground font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={adminData.first_name}
                    onChange={(e) => setAdminData({ ...adminData, first_name: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={adminData.last_name}
                    onChange={(e) => setAdminData({ ...adminData, last_name: e.target.value })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Work Email (Login Identifier) *</label>
                <input
                  type="email"
                  required
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={adminData.phone}
                  onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <OwnButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdminModal(false)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  disabled={adminCreating}
                  variant="primary"
                >
                  {adminCreating ? 'Creating...' : 'Create Administrator'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BusinessDetail
