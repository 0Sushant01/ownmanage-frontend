import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import type { Plan } from '../../types'

export const Plans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [monthlyCharge, setMonthlyCharge] = useState('')
  const [maxCentres, setMaxCentres] = useState(5)
  const [totalCapacity, setTotalCapacity] = useState(100)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

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
      setFormError(err.response?.data?.detail || 'Failed to create plan.')
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Commercial Subscription Plans
          </h1>
          <p className="text-sm text-slate-400">
            Configure pricing tiers, centre limits, and total employee capacity.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-sm font-bold text-white transition shadow-lg shadow-purple-600/20"
        >
          <span>+ Create New Plan</span>
        </button>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.is_active
                        ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                        : 'bg-slate-800 text-slate-400'
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
                    <span className="text-slate-400">Flexible Centre Allocation:</span>
                    <span className="text-xs text-purple-400 font-medium">Supported</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-800/60 pt-4 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
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
    </div>
  )
}
