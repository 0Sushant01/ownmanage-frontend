import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import type { Subscription } from '../types'
import { OwnCard, OwnCardContent, OwnCardHeader, OwnCardTitle } from '../design-system/components/OwnCard'
import { OwnBadge } from '../design-system/components/OwnBadge'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnDialog } from '../design-system/components/OwnDialog'

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
      <OwnCard className="p-8 flex items-center justify-center h-48 bg-card border-border">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </OwnCard>
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
    <OwnCard className="bg-card border-border shadow-md">
      <OwnCardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <OwnCardTitle className="text-lg font-bold text-foreground tracking-tight">Subscription & Capacity Usage</OwnCardTitle>
            <OwnBadge
              variant={status === 'ACTIVE' ? 'success' : 'warning'}
              size="sm"
            >
              {status}
            </OwnBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Plan: <span className="font-semibold text-foreground">{plan.name}</span> (₹{parseFloat(plan.monthly_charge).toFixed(0)}/mo)
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-muted-foreground">
          <div>
            Centres: <span className="text-foreground font-bold">{centresCount}</span> / {maxCentres}
          </div>
          <div className="h-4 w-px bg-border" />
          <div>
            Unallocated Pool: <span className="text-primary font-bold">{unallocated_capacity} seats</span>
          </div>
        </div>
      </OwnCardHeader>

      <OwnCardContent className="space-y-6 pt-6">
        {/* Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Centre Quota</span>
              <span className="font-mono text-foreground font-medium">
                {centresCount} of {maxCentres} Centres Used
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  centresCount >= maxCentres ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, (centresCount / maxCentres) * 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Allocated Seat Capacity</span>
              <span className="font-mono text-foreground font-medium">
                {total_allocated_capacity} of {totalCapacity} Seats ({capacityPercent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  capacityPercent >= 100 ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Centre Allocation Breakdown */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Centre Capacity Breakdown & Reallocation
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-mono uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-3">Centre Name</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Allocated Seats</th>
                  <th className="p-3">Active Staff</th>
                  <th className="p-3">Available Seats</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground font-mono">
                {centre_allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No centres configured for capacity allocation.
                    </td>
                  </tr>
                ) : (
                  centre_allocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-sans font-semibold text-foreground">{alloc.centre_name}</td>
                      <td className="p-3 text-muted-foreground">{alloc.centre_code}</td>
                      <td className="p-3 font-bold text-foreground">{alloc.allocated_capacity}</td>
                      <td className="p-3 text-muted-foreground">{alloc.active_employees_count}</td>
                      <td className="p-3">
                        <span
                          className={
                            alloc.available_capacity > 0 ? 'text-primary font-bold' : 'text-warning font-semibold'
                          }
                        >
                          {alloc.available_capacity}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <OwnButton
                          onClick={() => handleOpenReallocate(alloc)}
                          variant="secondary"
                          size="sm"
                        >
                          Reallocate
                        </OwnButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </OwnCardContent>

      {/* Reallocate Capacity Modal */}
      {selectedCentre && (
        <OwnDialog
          open={!!selectedCentre}
          onOpenChange={(open) => {
            if (!open) setSelectedCentre(null)
          }}
          title="Reallocate Capacity"
          description={`Adjust allocated seats for ${selectedCentre.name}.`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Current Active Employees:</span>
                <span className="font-bold text-foreground">{selectedCentre.activeStaff}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Plan Capacity:</span>
                <span className="font-mono text-foreground">{totalCapacity} seats</span>
              </div>
              <div className="flex justify-between">
                <span>Max Available for this Centre:</span>
                <span className="font-bold text-primary">
                  {selectedCentre.currentCapacity + unallocated_capacity} seats
                </span>
              </div>
            </div>

            {modalError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveReallocate} className="space-y-4">
              <OwnInput
                type="number"
                label="New Allocated Seats"
                required
                min={selectedCentre.activeStaff}
                max={selectedCentre.currentCapacity + unallocated_capacity}
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
              />

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <OwnButton
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedCentre(null)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  loading={modalSubmitting}
                >
                  Update Seats
                </OwnButton>
              </div>
            </form>
          </div>
        </OwnDialog>
      )}
    </OwnCard>
  )
}

