import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../services/api'
import type { Business, Plan, Subscription } from '../types'

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
        if (subRes.data?.plan?.id) {
          setSelectedPlanId(subRes.data.plan.id)
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

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading tenant management console...
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-rose-950/40 border border-rose-900 text-rose-300 p-4 rounded-xl">{error}</div>
        <Link to="/businesses" className="mt-4 inline-block text-xs text-emerald-400">← Back to Directory</Link>
      </div>
    )
  }

  const currentPlan = subscription?.plan
  const daysLeft = subscription?.days_remaining ?? business.days_remaining ?? 0
  const daysBadge =
    daysLeft <= 3
      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
      : daysLeft <= 7
      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
      : 'bg-slate-800 text-slate-300 border-slate-700'

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* 1. Header with Name & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/businesses" className="text-xs text-slate-400 hover:text-white transition">
            ← Back to Directory
          </Link>
          <div className="flex items-center space-x-3 mt-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{business.name}</h1>
            <span
              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                business.is_active
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                  : 'bg-rose-950/60 border-rose-800 text-rose-400'
              }`}
            >
              {business.is_active ? 'Active Tenant' : 'Deactivated'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Tenant UUID: {business.id}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowChangePlanModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/20"
          >
            Change Plan
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${
              business.is_active
                ? 'bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border-rose-800'
                : 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800'
            }`}
          >
            {business.is_active ? 'Deactivate Business' : 'Reactivate Business'}
          </button>
          <button
            onClick={() => setShowAdminModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20"
          >
            + Add Admin
          </button>
        </div>
      </div>

      {/* 2. Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</span>
          <div className="text-3xl font-extrabold text-white mt-1.5">{stats?.total_employees ?? 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered profiles</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Present Today</span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-1.5">{stats?.present_today ?? 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Checked in today</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absent Today</span>
          <div className="text-3xl font-extrabold text-amber-400 mt-1.5">{stats?.absent_today ?? 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Unrecorded</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">On Leave</span>
          <div className="text-3xl font-extrabold text-rose-400 mt-1.5">{stats?.on_leave ?? 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Approved leaves</span>
        </div>
      </div>

      {/* 3. Subscription & Billing Section (Section 12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base">💳</span>
              <h2 className="text-base font-bold text-white">Subscription & Billing Status</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Authoritative commercial entitlement and billing provenance.</p>
          </div>
          <button
            onClick={() => setShowChangePlanModal(true)}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            Upgrade / Downgrade Plan →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Current Plan</span>
            <span className="text-base font-bold text-purple-300">{currentPlan?.name || 'No Plan'}</span>
            <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
              ₹{currentPlan ? parseFloat(currentPlan.monthly_charge).toFixed(0) : '0'} / month
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Subscription Status</span>
            <span className="text-sm font-bold text-emerald-400 block mt-0.5">
              {subscription?.status || 'INACTIVE'}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              Started {subscription?.start_date || '—'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Current Period Expiry</span>
            <span className="text-sm font-bold text-white block mt-0.5 font-mono">
              {subscription?.current_period_end || '—'}
            </span>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${daysBadge}`}>
              {daysLeft < 0
                ? `EXPIRED • Expired ${Math.abs(daysLeft)} days ago`
                : daysLeft <= 7
                ? `EXPIRING SOON • Expires in ${daysLeft} days`
                : `ACTIVE • Expires in ${daysLeft} days`}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Payment Status</span>
            <span className="text-sm font-bold text-emerald-400 block mt-0.5">
              {subscription?.payment_status || 'PAID'}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              Last: ₹{subscription?.last_payment?.amount ? subscription.last_payment.amount.toLocaleString() : '—'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Assigned Partner Broker</span>
            <span className="text-sm font-bold text-amber-400 block mt-0.5">
              {subscription?.broker?.name || business.broker_name || 'Direct / Organic'}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Code: {subscription?.broker?.referral_code || business.broker_code || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Flexible Centre Allocation (Section 14 & 15) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base">🏢</span>
              <h2 className="text-base font-bold text-white">Dynamic Centre Capacity Allocation</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribute total plan capacity ({currentPlan?.total_employee_capacity ?? 0} seats) across centres.
              Sum of centre allocations must not exceed plan limit.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-300">
            Total Allocated:{' '}
            <strong className="text-emerald-400 font-bold">
              {centres.reduce((sum, c) => sum + (c.allocated_capacity || 0), 0)}
            </strong>{' '}
            / {currentPlan?.total_employee_capacity ?? 0} seats
          </div>
        </div>

        {centres.length === 0 ? (
          <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
            No centres registered yet for this tenant.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centres.map((c) => {
              const allocated = c.allocated_capacity || 0
              const active = c.active_employees_count || 0
              const pct = allocated > 0 ? Math.min(100, Math.round((active / allocated) * 100)) : 0

              return (
                <div key={c.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{c.name}</h4>
                      <span className="text-[10px] font-mono text-slate-500">Code: {c.code}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCentreForAlloc(c)
                        setNewAllocCapacity(allocated)
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-800/50 rounded-lg text-xs font-medium transition"
                    >
                      Adjust Capacity
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Staff Usage:</span>
                      <span className="font-mono text-white">
                        <strong className="text-emerald-400">{active}</strong> / {allocated} seats ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'
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
      </div>

      {/* 5. Tenant Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Tenant Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-1">Official Legal Name</span>
            <span className="text-white font-medium">{business.legal_name || 'Not provided'}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Contact Email / Phone</span>
            <span className="text-white font-medium">{business.email || '—'} / {business.phone || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Location</span>
            <span className="text-white font-medium">{business.city || '—'}, {business.state || '—'}, {business.country}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Timezone & Currency</span>
            <span className="text-white font-mono">{business.timezone} / {business.currency}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Employee ID Sequence</span>
            <span className="text-emerald-400 font-mono">
              {business.employee_id_enabled ? `Prefix: ${business.employee_id_prefix}, Next: #${business.employee_id_next_number}` : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Registration Date</span>
            <span className="text-slate-400 font-mono">{new Date(business.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 6. Subscription History Section (Section 21) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base">📜</span>
              <h3 className="text-base font-bold text-white">Subscription & Plan Change History</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Permanent immutable audit log of tier upgrades, renewals, and capacity changes.</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
            No historical plan modifications recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Effective Date</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Monthly Charge</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3">Centres Cap</th>
                  <th className="py-2.5 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{h.effective_from}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-950/80 border border-purple-800/60 text-purple-300">
                        {h.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{h.plan_name}</td>
                    <td className="py-2.5 px-3 font-mono">₹{parseFloat(h.monthly_charge).toFixed(0)}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{h.total_employee_capacity} seats</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{h.max_centres} branches</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{h.reason || 'Administrative change'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Capacity Modal */}
      {selectedCentreForAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Adjust Centre Capacity</h3>
              <button onClick={() => setSelectedCentreForAlloc(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Centre:</span>
                  <strong className="text-white">{selectedCentreForAlloc.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Staff:</span>
                  <strong className="text-emerald-400">{selectedCentreForAlloc.active_employees_count} employees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Pool in Plan:</span>
                  <strong className="text-purple-400">
                    {subscription?.unallocated_capacity ?? 0} seats unallocated
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Allocated Capacity (seats) *
                </label>
                <input
                  type="number"
                  required
                  min={selectedCentreForAlloc.active_employees_count}
                  value={newAllocCapacity}
                  onChange={(e) => setNewAllocCapacity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cannot be lower than currently active employees ({selectedCentreForAlloc.active_employees_count}).
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCentreForAlloc(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAlloc}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {savingAlloc ? 'Saving...' : 'Update Capacity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Change Subscription Plan</h3>
              <button onClick={() => setShowChangePlanModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleChangePlan} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Plan:</span>
                  <strong className="text-purple-400">{currentPlan?.name || 'No Plan'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Monthly Charge:</span>
                  <span className="font-mono text-white">₹{currentPlan ? parseFloat(currentPlan.monthly_charge).toFixed(0) : '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Seat Capacity:</span>
                  <span className="font-mono text-white">{currentPlan?.total_employee_capacity ?? 0} seats</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select New Plan *</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
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
                <label className="block text-slate-300 font-semibold mb-1">Reason for Plan Change</label>
                <input
                  type="text"
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  placeholder="e.g. Enterprise expansion upgrade"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowChangePlanModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan || !selectedPlanId}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {savingPlan ? 'Applying Plan...' : 'Confirm Plan Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {business.is_active ? '⚠️ Deactivate Business Tenant' : '✅ Reactivate Business Tenant'}
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                <strong>Business:</strong> {business.name}
              </p>
              {business.is_active ? (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300">
                  <strong>Warning:</strong> Deactivating this business prevents all administrators, managers, and employees from accessing the portal. Existing data and payroll history remain preserved.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300">
                  Reactivating this business will restore system access for all its users.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={updatingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                  business.is_active ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {updatingStatus ? 'Updating...' : business.is_active ? 'Yes, Deactivate' : 'Yes, Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Business Administrator</h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {adminSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl">
                {adminSuccess}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={adminData.first_name}
                    onChange={(e) => setAdminData({ ...adminData, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={adminData.last_name}
                    onChange={(e) => setAdminData({ ...adminData, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Email (Login Identifier) *</label>
                <input
                  type="email"
                  required
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={adminData.phone}
                  onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminCreating}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {adminCreating ? 'Creating...' : 'Create Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
