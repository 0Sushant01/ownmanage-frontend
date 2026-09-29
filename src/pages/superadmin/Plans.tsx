import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import type { Plan } from '../../types'

interface PlanSubscriber {
  business_id: string
  business_name: string
  business_email: string
  status: string
  start_date: string | null
  expiry_date: string | null
  days_remaining: number | null
  active_employees: number
}

interface PlanSubscribersResponse {
  plan_id: string
  plan_name: string
  total_subscribers: number
  subscribers: PlanSubscriber[]
}

export const Plans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'archived'>('all')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [monthlyCharge, setMonthlyCharge] = useState('')
  const [maxCentres, setMaxCentres] = useState(5)
  const [totalCapacity, setTotalCapacity] = useState(100)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Edit Modal
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCentres, setEditCentres] = useState(5)
  const [editCapacity, setEditCapacity] = useState(100)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Subscribers Modal
  const [selectedPlanForSubs, setSelectedPlanForSubs] = useState<Plan | null>(null)
  const [subscribersData, setSubscribersData] = useState<PlanSubscribersResponse | null>(null)
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [subsError, setSubsError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/plans/')
      setPlans(res.data?.results || res.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch commercial plans.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim() || !monthlyCharge) {
      setFormError('Plan name and monthly price are required.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiClient.post('/plans/', {
        name: name.trim(),
        monthly_charge: monthlyCharge,
        max_centres: Number(maxCentres),
        total_employee_capacity: Number(totalCapacity),
        features: {
          attendance: true,
          leaves: true,
          payroll: true,
          overtime: true,
        },
      })
      setShowCreateModal(false)
      setName('')
      setMonthlyCharge('')
      setMaxCentres(5)
      setTotalCapacity(100)
      fetchPlans()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || err.response?.data?.total_employee_capacity?.[0] || 'Failed to create plan.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const openEditModal = (p: Plan) => {
    setEditingPlan(p)
    setEditName(p.name)
    setEditPrice(p.monthly_charge)
    setEditCentres(p.max_centres)
    setEditCapacity(p.total_employee_capacity)
    setEditError(null)
  }

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return
    setEditError(null)
    setEditSubmitting(true)

    try {
      await apiClient.patch(`/plans/${editingPlan.id}/`, {
        name: editName.trim(),
        monthly_charge: editPrice,
        max_centres: Number(editCentres),
        total_employee_capacity: Number(editCapacity),
      })
      setEditingPlan(null)
      fetchPlans()
    } catch (err: any) {
      setEditError(
        err.response?.data?.detail ||
        err.response?.data?.total_employee_capacity?.[0] ||
        'Failed to update plan parameters.'
      )
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleTogglePlanActive = async (p: Plan) => {
    const action = p.is_active ? 'archive/deactivate' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} "${p.name}"?`)) {
      return
    }

    try {
      await apiClient.patch(`/plans/${p.id}/`, {
        is_active: !p.is_active,
      })
      fetchPlans()
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to update plan status.`)
    }
  }

  const openSubscribersModal = async (p: Plan) => {
    setSelectedPlanForSubs(p)
    setSubscribersData(null)
    setSubsError(null)
    setLoadingSubs(true)

    try {
      const res = await apiClient.get<PlanSubscribersResponse>(`/plans/${p.id}/subscribers/`)
      setSubscribersData(res.data)
    } catch (err: any) {
      setSubsError(err.response?.data?.detail || 'Failed to load subscriber businesses.')
    } finally {
      setLoadingSubs(false)
    }
  }

  const filteredPlans = plans.filter((p) => {
    if (filterTab === 'active') return p.is_active
    if (filterTab === 'archived') return !p.is_active
    return true
  })

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-purple-400 font-bold">
              SUBSCRIPTION TIERS & CAPACITY
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Commercial Subscription Plans
          </h1>
          <p className="text-sm text-slate-400">
            Configure pricing tiers, centre limits, and total employee capacity with seat-usage protection.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-sm font-bold text-white transition shadow-lg shadow-purple-600/20"
        >
          <span>+ Create New Plan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        {(['all', 'active', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              filterTab === tab
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
            }`}
          >
            {tab === 'all' ? `All Plans (${plans.length})` : tab === 'active' ? `Active (${plans.filter(p => p.is_active).length})` : `Archived (${plans.filter(p => !p.is_active).length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-500 text-sm">
          No plans found under this filter tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border ${
                p.is_active ? 'border-slate-800 bg-slate-900/60' : 'border-slate-800/60 bg-slate-950/40 opacity-80'
              } p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-xl`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.is_active
                        ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline space-x-1">
                  <span className="text-3xl font-extrabold text-white">₹{parseFloat(p.monthly_charge).toFixed(0)}</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <div className="mt-6 space-y-3 border-t border-slate-800/80 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Centres / Branches:</span>
                    <span className="font-mono font-bold text-white">{p.max_centres}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Employee Capacity:</span>
                    <span className="font-mono font-bold text-emerald-400">{p.total_employee_capacity} seats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Subscribers:</span>
                    <button
                      onClick={() => openSubscribersModal(p)}
                      className="px-2.5 py-0.5 rounded-lg bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-semibold hover:bg-purple-900 transition flex items-center space-x-1"
                    >
                      <span>🏢</span>
                      <span>{p.active_subscribers_count ?? 0} active</span>
                      <span className="text-[10px] text-slate-400">({p.total_subscribers_count ?? 0} total)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-800/60 pt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  Created {new Date(p.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleTogglePlanActive(p)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition ${
                      p.is_active
                        ? 'bg-rose-950/60 border border-rose-900/60 text-rose-300 hover:bg-rose-900'
                        : 'bg-emerald-950/60 border border-emerald-900/60 text-emerald-300 hover:bg-emerald-900'
                    }`}
                  >
                    {p.is_active ? 'Archive' : 'Restore'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Create Subscription Plan</h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter the commercial capacity parameters for this tier.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Growth 2026"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Monthly Price (INR)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={monthlyCharge}
                  onChange={(e) => setMonthlyCharge(e.target.value)}
                  placeholder="1499.00"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Max Centres
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={maxCentres}
                    onChange={(e) => setMaxCentres(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={totalCapacity}
                    onChange={(e) => setTotalCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plan Modal with Seat Capacity Validation Alert */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Edit Plan: {editingPlan.name}</h2>
            <p className="text-xs text-slate-400 mb-4">
              Update capacity and pricing parameters. Capacity cannot be reduced below active subscriber employee counts.
            </p>

            {editError && (
              <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Monthly Price (INR)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Max Centres
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editCentres}
                    onChange={(e) => setEditCentres(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Subscribers Drawer / Modal */}
      {selectedPlanForSubs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Subscribers of {selectedPlanForSubs.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Businesses currently or previously enrolled in this commercial tier.
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanForSubs(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {subsError && (
              <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                {subsError}
              </div>
            )}

            {loadingSubs ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              </div>
            ) : subscribersData?.subscribers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No businesses are currently subscribed to this tier.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Business</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Active Staff</th>
                      <th className="p-3">Days Left</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {subscribersData?.subscribers.map((sub) => (
                      <tr key={sub.business_id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-semibold text-white">{sub.business_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{sub.business_email}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sub.status === 'ACTIVE_PAID' || sub.status === 'TRIAL'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">
                          {sub.active_employees} seats
                        </td>
                        <td className="p-3 font-mono">
                          {sub.days_remaining !== null ? `${sub.days_remaining}d` : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            to={`/businesses/${sub.business_id}`}
                            className="text-purple-400 hover:text-purple-300 font-semibold"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPlanForSubs(null)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

