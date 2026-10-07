import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import type { Plan } from '../../types'
import {
  OwnCard,
  OwnBadge,
  OwnButton,
  OwnPageHeader,
} from '../../design-system'

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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <OwnPageHeader
        title="Commercial Subscription Plans"
        description="Configure pricing tiers, centre limits, and total employee capacity with seat-usage protection."
        badge={
          <OwnBadge variant="primary" size="sm">
            Subscription Tiers & Capacity
          </OwnBadge>
        }
        action={
          <OwnButton
            onClick={() => setShowCreateModal(true)}
            variant="primary"
          >
            + Create New Plan
          </OwnButton>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-border pb-3">
        {(['all', 'active', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
              filterTab === tab
                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground bg-card border border-border'
            }`}
          >
            {tab === 'all'
              ? `All Plans (${plans.length})`
              : tab === 'active'
              ? `Active (${plans.filter((p) => p.is_active).length})`
              : `Archived (${plans.filter((p) => !p.is_active).length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
          No plans found under this filter tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((p) => (
            <OwnCard
              key={p.id}
              className={`p-6 flex flex-col justify-between transition shadow-xs ${
                p.is_active ? 'border-border bg-card' : 'border-border/60 bg-muted/20 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
                  <OwnBadge
                    variant={p.is_active ? 'success' : 'outline'}
                    size="sm"
                  >
                    {p.is_active ? 'Active' : 'Archived'}
                  </OwnBadge>
                </div>

                <div className="mt-4 flex items-baseline space-x-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    ₹{parseFloat(p.monthly_charge).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>

                <div className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Max Centres / Branches:</span>
                    <span className="font-mono font-bold text-foreground">{p.max_centres}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Employee Capacity:</span>
                    <span className="font-mono font-bold text-primary">{p.total_employee_capacity} seats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subscribers:</span>
                    <button
                      onClick={() => openSubscribersModal(p)}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition flex items-center space-x-1 cursor-pointer"
                    >
                      <span>🏢</span>
                      <span>{p.active_subscribers_count ?? 0} active</span>
                      <span className="text-[10px] text-muted-foreground">({p.total_subscribers_count ?? 0} total)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Created {new Date(p.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center space-x-2">
                  <OwnButton
                    onClick={() => openEditModal(p)}
                    size="xs"
                    variant="secondary"
                  >
                    Edit
                  </OwnButton>
                  <OwnButton
                    onClick={() => handleTogglePlanActive(p)}
                    size="xs"
                    variant={p.is_active ? 'destructive' : 'outline'}
                  >
                    {p.is_active ? 'Archive' : 'Restore'}
                  </OwnButton>
                </div>
              </div>
            </OwnCard>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-2">Create Subscription Plan</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Enter the commercial capacity parameters for this tier.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Growth 2026"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Monthly Price (INR)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={monthlyCharge}
                  onChange={(e) => setMonthlyCharge(e.target.value)}
                  placeholder="1499.00"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Max Centres
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={maxCentres}
                    onChange={(e) => setMaxCentres(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={totalCapacity}
                    onChange={(e) => setTotalCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-border">
                <OwnButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  variant="primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Creating...' : 'Create Plan'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plan Modal with Seat Capacity Validation Alert */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-2">Edit Plan: {editingPlan.name}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Update capacity and pricing parameters. Capacity cannot be reduced below active subscriber employee counts.
            </p>

            {editError && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Monthly Price (INR)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Max Centres
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editCentres}
                    onChange={(e) => setEditCentres(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-border">
                <OwnButton
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPlan(null)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  variant="primary"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Saving...' : 'Save Plan'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Subscribers Drawer / Modal */}
      {selectedPlanForSubs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Subscribers of {selectedPlanForSubs.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Businesses currently or previously enrolled in this commercial tier.
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanForSubs(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {subsError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {subsError}
              </div>
            )}

            {loadingSubs ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : subscribersData?.subscribers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No businesses are currently subscribed to this tier.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Business</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Active Staff</th>
                      <th className="p-3">Days Left</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {subscribersData?.subscribers.map((sub) => (
                      <tr key={sub.business_id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{sub.business_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{sub.business_email}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sub.status === 'ACTIVE_PAID' || sub.status === 'TRIAL'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {sub.active_employees} seats
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {sub.days_remaining !== null ? `${sub.days_remaining}d` : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            to={`/businesses/${sub.business_id}`}
                            className="text-primary hover:underline font-semibold"
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

            <div className="flex justify-end pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="outline"
                onClick={() => setSelectedPlanForSubs(null)}
              >
                Close
              </OwnButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

