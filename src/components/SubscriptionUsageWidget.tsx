import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import type { Subscription } from '../types'

export const SubscriptionUsageWidget: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reallocate modal state
  const [selectedCentre, setSelectedCentre] = useState<{ id: string; name: string; currentCapacity: number; activeStaff: number } | null>(null)
  const [newCapacity, setNewCapacity] = useState<number>(0)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/subscriptions/')
      setSubscription(res.data)
    } catch (err: any) {
      // If enterprise has no subscription yet or endpoint error
      setError(err.response?.data?.detail || 'No subscription found.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [])

  const handleOpenReallocate = (alloc: any) => {
    setSelectedCentre({
      id: alloc.centre,
      name: alloc.centre_name,
      currentCapacity: alloc.allocated_capacity,
      activeStaff: alloc.active_employees_count,
    })
    setNewCapacity(alloc.allocated_capacity)
    setModalError(null)
  }

  const handleSaveReallocate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCentre || !subscription) return
    setModalError(null)

    if (newCapacity < selectedCentre.activeStaff) {
      setModalError(`Capacity cannot be reduced below current active staff count (${selectedCentre.activeStaff}).`)
      return
    }

    setModalSubmitting(true)
    try {
      await apiClient.post('/subscriptions/reallocate-capacity/', {
        centre_id: selectedCentre.id,
        new_capacity: Number(newCapacity),
      })
      setSelectedCentre(null)
      fetchSubscription()
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to update centre capacity.')
    } finally {
      setModalSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex items-center justify-center h-48">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !subscription) {
    return null
  }

  const { plan, centre_allocations, total_allocated_capacity, unallocated_capacity, status } = subscription
  const totalCapacity = plan.total_employee_capacity
  const capacityPercent = totalCapacity > 0 ? Math.min(100, Math.round((total_allocated_capacity / totalCapacity) * 100)) : 0
  const centresCount = centre_allocations.length
  const maxCentres = plan.max_centres

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Subscription & Capacity Usage</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                status === 'ACTIVE'
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                  : 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Plan: <span className="font-semibold text-slate-200">{plan.name}</span> (₹{parseFloat(plan.monthly_charge).toFixed(0)}/mo)
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <div>
            Centres: <span className="text-white font-bold">{centresCount}</span> / {maxCentres}
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div>
            Unallocated Pool: <span className="text-emerald-400 font-bold">{unallocated_capacity} seats</span>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Centre Quota</span>
            <span className="font-mono text-slate-200">
              {centresCount} of {maxCentres} Centres Used
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                centresCount >= maxCentres ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (centresCount / maxCentres) * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Allocated Seat Capacity</span>
            <span className="font-mono text-slate-200">
              {total_allocated_capacity} of {totalCapacity} Seats ({capacityPercent}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                capacityPercent >= 100 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Centre Allocation Breakdown */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Centre Capacity Breakdown & Reallocation
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="p-3">Centre Name</th>
                <th className="p-3">Code</th>
                <th className="p-3">Allocated Seats</th>
                <th className="p-3">Active Staff</th>
                <th className="p-3">Available Seats</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {centre_allocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No centres configured for capacity allocation.
                  </td>
                </tr>
              ) : (
                centre_allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-sans font-semibold text-white">{alloc.centre_name}</td>
                    <td className="p-3 text-slate-400">{alloc.centre_code}</td>
                    <td className="p-3 font-bold text-slate-200">{alloc.allocated_capacity}</td>
                    <td className="p-3 text-slate-300">{alloc.active_employees_count}</td>
                    <td className="p-3">
                      <span
                        className={
                          alloc.available_capacity > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400'
                        }
                      >
                        {alloc.available_capacity}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenReallocate(alloc)}
                        className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-sans font-medium text-slate-200 transition"
                      >
                        Reallocate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reallocate Capacity Modal */}
      {selectedCentre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Reallocate Capacity</h3>
            <p className="text-xs text-slate-400 mb-4">
              Adjust seats for <span className="font-semibold text-white">{selectedCentre.name}</span>.
            </p>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1 mb-4 text-slate-300">
              <div className="flex justify-between">
                <span>Current Active Employees:</span>
                <span className="font-bold text-white">{selectedCentre.activeStaff}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Plan Capacity:</span>
                <span className="font-mono text-white">{totalCapacity} seats</span>
              </div>
              <div className="flex justify-between">
                <span>Max Available for this Centre:</span>
                <span className="font-bold text-emerald-400">
                  {selectedCentre.currentCapacity + unallocated_capacity} seats
                </span>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveReallocate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  New Allocated Seats
                </label>
                <input
                  type="number"
                  required
                  min={selectedCentre.activeStaff}
                  max={selectedCentre.currentCapacity + unallocated_capacity}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCentre(null)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-50"
                >
                  {modalSubmitting ? 'Saving...' : 'Update Seats'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
