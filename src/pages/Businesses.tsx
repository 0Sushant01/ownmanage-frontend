import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../services/api'
import type { Business, Plan } from '../types'
import {
  OwnCard,
  OwnBadge,
  OwnButton,
  OwnPageHeader,
} from '../design-system'

export const Businesses: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [planFilter, setPlanFilter] = useState('ALL')
  const [brokerFilter, setBrokerFilter] = useState('ALL')

  // Create Business Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    employee_id_enabled: true,
    employee_id_prefix: 'EMP',
  })

  // Change Plan Modal State
  const [selectedBizForPlan, setSelectedBizForPlan] = useState<Business | null>(null)
  const [selectedNewPlanId, setSelectedNewPlanId] = useState<string>('')
  const [changePlanReason, setChangePlanReason] = useState<string>('')
  const [changingPlan, setChangingPlan] = useState(false)

  // Deactivate / Reactivate Modal State
  const [selectedBizForStatus, setSelectedBizForStatus] = useState<Business | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [bizRes, plansRes] = await Promise.all([
        apiClient.get('/businesses/'),
        apiClient.get('/plans/'),
      ])
      setBusinesses(bizRes.data?.results || bizRes.data || [])
      setPlans(plansRes.data?.results || plansRes.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load businesses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = b.name.toLowerCase().includes(q)
        const matchesLegal = (b.legal_name || '').toLowerCase().includes(q)
        const matchesId = b.id.toLowerCase().includes(q)
        const matchesEmail = (b.email || '').toLowerCase().includes(q)
        const matchesPhone = (b.phone || '').toLowerCase().includes(q)
        if (!matchesName && !matchesLegal && !matchesId && !matchesEmail && !matchesPhone) {
          return false
        }
      }

      // Status Filter
      if (statusFilter === 'ACTIVE' && !b.is_active) return false
      if (statusFilter === 'INACTIVE' && b.is_active) return false
      if (statusFilter === 'EXPIRED' && (b.days_remaining === undefined || b.days_remaining >= 0)) return false
      if (statusFilter === 'EXPIRING_SOON' && (b.days_remaining === undefined || b.days_remaining < 0 || b.days_remaining > 7)) return false
      if (statusFilter === 'PAYMENT_PENDING' && b.payment_status !== 'PENDING') return false
      if (statusFilter === 'PAYMENT_OVERDUE' && b.payment_status !== 'OVERDUE') return false

      // Plan Filter
      if (planFilter !== 'ALL' && b.current_plan_name !== planFilter) return false

      // Broker Filter
      if (brokerFilter !== 'ALL') {
        if (brokerFilter === 'DIRECT' && b.broker_name) return false
        if (brokerFilter !== 'DIRECT' && b.broker_name !== brokerFilter) return false
      }

      return true
    })
  }, [businesses, searchQuery, statusFilter, planFilter, brokerFilter])

  // Extract unique brokers for filter
  const brokerOptions = useMemo(() => {
    const names = new Set<string>()
    businesses.forEach((b) => {
      if (b.broker_name) names.add(b.broker_name)
    })
    return Array.from(names)
  }, [businesses])

  // Export to CSV (Section 48)
  const handleExportCSV = () => {
    const headers = [
      'Business Name',
      'Business ID',
      'Current Plan',
      'Subscription Status',
      'Payment Status',
      'Start Date',
      'Expiry Date',
      'Days Remaining',
      'Total Centres',
      'Employee Capacity',
      'Active Employees',
      'Managers',
      'Broker',
      'Business Status',
      'Official Email',
      'Phone',
      'City',
    ]

    const rows = filteredBusinesses.map((b) => [
      `"${b.name.replace(/"/g, '""')}"`,
      `"${b.id}"`,
      `"${b.current_plan_name || 'No Plan'}"`,
      `"${b.subscription_status || 'INACTIVE'}"`,
      `"${b.payment_status || 'UNBILLED'}"`,
      `"${b.start_date || ''}"`,
      `"${b.expiry_date || ''}"`,
      b.days_remaining ?? '',
      b.total_centres ?? 0,
      b.employee_capacity ?? 0,
      b.active_employees_count ?? 0,
      b.managers_count ?? 0,
      `"${b.broker_name ? `${b.broker_name} (${b.broker_code || ''})` : 'Direct'}"`,
      b.is_active ? 'Active' : 'Inactive',
      `"${b.email || ''}"`,
      `"${b.phone || ''}"`,
      `"${b.city || ''}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ownmanage_businesses_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle Create Business Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiClient.post('/businesses/', formData)
      setShowCreateModal(false)
      setFormData({
        name: '',
        legal_name: '',
        email: '',
        phone: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        employee_id_enabled: true,
        employee_id_prefix: 'EMP',
      })
      await fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create business.')
    } finally {
      setCreating(false)
    }
  }

  // Handle Change Plan Submit
  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBizForPlan || !selectedNewPlanId) return
    setChangingPlan(true)
    try {
      await apiClient.post('/subscriptions/', {
        business_id: selectedBizForPlan.id,
        plan_id: selectedNewPlanId,
        reason: changePlanReason || 'Administrative plan modification by SuperAdmin',
      })
      setSelectedBizForPlan(null)
      setSelectedNewPlanId('')
      setChangePlanReason('')
      await fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to change plan.')
    } finally {
      setChangingPlan(false)
    }
  }

  // Handle Status Toggle (Deactivate / Reactivate)
  const handleStatusSubmit = async () => {
    if (!selectedBizForStatus) return
    setUpdatingStatus(true)
    try {
      await apiClient.patch(`/businesses/${selectedBizForStatus.id}/`, {
        is_active: !selectedBizForStatus.is_active,
      })
      setSelectedBizForStatus(null)
      await fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update business status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Page Header */}
      <OwnPageHeader
        title="Business Directory"
        description="Complete management table of all enterprise tenants, commercial subscriptions, capacities, and partners."
        badge={
          <OwnBadge variant="primary" size="sm">
            SuperAdmin Tenant Management
          </OwnBadge>
        }
        actions={
          <div className="flex items-center space-x-3">
            <OwnButton
              onClick={handleExportCSV}
              disabled={filteredBusinesses.length === 0}
              variant="outline"
              size="sm"
            >
              📥 Export CSV
            </OwnButton>
            <OwnButton
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              size="sm"
            >
              + Register Business
            </OwnButton>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <OwnCard className="p-4 space-y-3 bg-card border-border shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Live Search */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Search Directory</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, ID, email, or phone..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Businesses Only</option>
              <option value="INACTIVE">Inactive / Suspended</option>
              <option value="EXPIRING_SOON">Expiring in 7 Days</option>
              <option value="EXPIRED">Subscription Expired</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="PAYMENT_OVERDUE">Payment Overdue</option>
            </select>
          </div>

          {/* Commercial Plan Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Commercial Plan</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Broker Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Partner Broker</label>
            <select
              value={brokerFilter}
              onChange={(e) => setBrokerFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="DIRECT">Direct / Organic Only</option>
              {brokerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredBusinesses.length}</strong> of{' '}
            <strong className="text-foreground">{businesses.length}</strong> businesses
          </span>
          {(searchQuery || statusFilter !== 'ALL' || planFilter !== 'ALL' || brokerFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('ALL')
                setPlanFilter('ALL')
                setBrokerFilter('ALL')
              }}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </OwnCard>

      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-xl text-sm">{error}</div>}

      {/* Main 15-Column Business Management Table */}
      {loading ? (
        <div className="h-64 bg-card border border-border rounded-2xl animate-pulse flex items-center justify-center text-muted-foreground text-sm">
          Loading comprehensive business directory...
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
          No businesses found matching the selected filter criteria.
        </div>
      ) : (
        <OwnCard className="overflow-hidden border-border bg-card shadow-xs">
          {/* Mobile View: Fluid Responsive Cards */}
          <div className="md:hidden divide-y divide-border">
            {filteredBusinesses.map((b) => {
              const days = b.days_remaining ?? 0
              return (
                <div key={b.id} className="p-4 space-y-3 transition-colors hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/businesses/${b.id}`} className="hover:text-primary transition font-bold text-foreground text-sm truncate block">
                        {b.name}
                      </Link>
                      <span className="text-[10px] font-mono text-muted-foreground block truncate">
                        ID: {b.id.slice(0, 8)}... • {b.city || 'Bengaluru'}
                      </span>
                    </div>
                    <OwnBadge variant={b.is_active ? 'success' : 'danger'} size="sm">
                      {b.is_active ? 'Active' : 'Inactive'}
                    </OwnBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Current Plan</span>
                      <span className="font-semibold text-primary block truncate">{b.current_plan_name || 'No Plan'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Staff Capacity</span>
                      <span className="font-mono text-foreground font-semibold block">
                        {b.active_employees_count || 0} / {b.employee_capacity || '∞'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Centres & Managers</span>
                      <span className="text-foreground block text-[11px]">
                        {b.total_centres || 0} centres • {b.managers_count || 0} mgrs
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Subscription</span>
                      <span className="text-foreground block text-[11px] font-medium">
                        {b.subscription_status || 'INACTIVE'} {days > 0 ? `(${days}d left)` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/businesses/${b.id}`}
                      className="flex-1 text-center py-1.5 px-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border text-xs font-semibold transition"
                    >
                      Workspace
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedBizForPlan(b)
                        setSelectedNewPlanId(b.current_plan_id || '')
                      }}
                      className="py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 text-xs font-semibold transition cursor-pointer"
                    >
                      Plan
                    </button>
                    <button
                      onClick={() => setSelectedBizForStatus(b)}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                        b.is_active
                          ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {b.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop / Tablet View: Wide Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/50 text-[10px] uppercase font-mono text-muted-foreground border-b border-border tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">Business Name & ID</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Current Plan</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Subscription</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Payment</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Expiry Date</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Days Left</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Centres</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Seat Capacity</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Active Staff</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Managers</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Partner Broker</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Business Status</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredBusinesses.map((b) => {
                  const days = b.days_remaining ?? 0
                  const daysBadgeColor =
                    days <= 3
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : days <= 7
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-muted text-muted-foreground border border-border'

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition">
                      {/* 1. Name & ID */}
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <Link to={`/businesses/${b.id}`} className="hover:text-primary transition block font-bold">
                          {b.name}
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground block truncate max-w-[130px]">
                          ID: {b.id.slice(0, 8)}...
                        </span>
                      </td>

                      {/* 2. Plan */}
                      <td className="px-4 py-3 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[11px] whitespace-nowrap">
                          {b.current_plan_name || 'No Plan'}
                        </span>
                      </td>

                      {/* 3. Subscription Status */}
                      <td className="px-4 py-3">
                        <OwnBadge
                          variant={
                            b.subscription_status === 'ACTIVE' || b.subscription_status === 'ACTIVE_PAID'
                              ? 'success'
                              : b.subscription_status === 'TRIAL'
                              ? 'info'
                              : 'outline'
                          }
                          size="sm"
                        >
                          {b.subscription_status || 'INACTIVE'}
                        </OwnBadge>
                      </td>

                      {/* 4. Payment Status */}
                      <td className="px-4 py-3">
                        <OwnBadge
                          variant={
                            b.payment_status === 'PAID'
                              ? 'success'
                              : b.payment_status === 'OVERDUE'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {b.payment_status || 'UNBILLED'}
                        </OwnBadge>
                      </td>

                      {/* 5. Expiry Date */}
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                        {b.expiry_date || '—'}
                      </td>

                      {/* 6. Days Left */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.expiry_date ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${daysBadgeColor}`}>
                            {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* 7. Total Centres */}
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {b.total_centres ?? 0}
                      </td>

                      {/* 8. Employee Capacity */}
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {b.employee_capacity ?? 0} seats
                      </td>

                      {/* 9. Active Employees */}
                      <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {b.active_employees_count ?? 0}
                      </td>

                      {/* 10. Managers */}
                      <td className="px-4 py-3 font-mono text-primary">
                        {b.managers_count ?? 0}
                      </td>

                      {/* 11. Broker */}
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {b.broker_name ? (
                          <span className="text-primary font-medium">
                            {b.broker_name} <span className="font-mono text-[10px] text-muted-foreground">({b.broker_code})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Direct</span>
                        )}
                      </td>

                      {/* 12. Business Status */}
                      <td className="px-4 py-3">
                        <OwnBadge
                          variant={b.is_active ? 'success' : 'danger'}
                          size="sm"
                        >
                          {b.is_active ? 'Active' : 'Deactivated'}
                        </OwnBadge>
                      </td>

                      {/* 13. Actions */}
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          to={`/businesses/${b.id}`}
                          className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border transition font-medium text-xs inline-block"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedBizForPlan(b)
                            setSelectedNewPlanId(b.current_plan_id || '')
                          }}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 transition font-medium text-xs cursor-pointer"
                        >
                          Plan
                        </button>
                        <button
                          onClick={() => setSelectedBizForStatus(b)}
                          className={`px-2 py-1 rounded-lg border transition font-medium text-xs cursor-pointer ${
                            b.is_active
                              ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {b.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </OwnCard>
      )}

      {/* Change Plan Modal (Section 13) */}
      {selectedBizForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Change Subscription Plan</h3>
                <p className="text-xs text-muted-foreground">Upgrade or downgrade {selectedBizForPlan.name}&apos;s entitlement tier.</p>
              </div>
              <button onClick={() => setSelectedBizForPlan(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleChangePlanSubmit} className="space-y-4 text-xs">
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Plan:</span>
                  <strong className="text-primary">{selectedBizForPlan.current_plan_name || 'No Plan'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Employee Capacity:</span>
                  <strong className="text-foreground">{selectedBizForPlan.employee_capacity || 0} seats</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currently Active Employees:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{selectedBizForPlan.active_employees_count || 0} employees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Centres:</span>
                  <strong className="text-foreground">{selectedBizForPlan.total_centres || 0} centres</strong>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Select New Commercial Plan *</label>
                <select
                  required
                  value={selectedNewPlanId}
                  onChange={(e) => setSelectedNewPlanId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Choose New Plan --</option>
                  {plans.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{parseFloat(p.monthly_charge).toFixed(0)}/mo ({p.total_employee_capacity} seats, max {p.max_centres} centres)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Administrative Reason / Notes</label>
                <input
                  type="text"
                  value={changePlanReason}
                  onChange={(e) => setChangePlanReason(e.target.value)}
                  placeholder="e.g. Requested mid-cycle enterprise capacity expansion"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <OwnButton
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBizForPlan(null)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  variant="primary"
                  disabled={changingPlan || !selectedNewPlanId}
                >
                  {changingPlan ? 'Applying Plan Change...' : 'Confirm & Save Plan'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate Modal (Section 35) */}
      {selectedBizForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {selectedBizForStatus.is_active ? '⚠️ Deactivate Business Tenant' : '✅ Reactivate Business Tenant'}
              </h3>
              <button onClick={() => setSelectedBizForStatus(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <div className="text-xs text-foreground space-y-2">
              <p>
                <strong>Business:</strong> {selectedBizForStatus.name} ({selectedBizForStatus.current_plan_name})
              </p>
              <p>
                <strong>Active Staff:</strong> {selectedBizForStatus.active_employees_count} employees across {selectedBizForStatus.total_centres} centres.
              </p>
              {selectedBizForStatus.is_active ? (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
                  <strong>Warning:</strong> Deactivating this business will immediately block all its business administrators, managers, and staff members from accessing OwnManage. Historical payroll and attendance records will remain preserved.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  Reactivating this business will restore full access for its administrators and staff members according to their subscription plan.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="outline"
                onClick={() => setSelectedBizForStatus(null)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="button"
                onClick={handleStatusSubmit}
                disabled={updatingStatus}
                variant={selectedBizForStatus.is_active ? 'destructive' : 'primary'}
              >
                {updatingStatus
                  ? 'Updating...'
                  : selectedBizForStatus.is_active
                  ? 'Yes, Deactivate Business'
                  : 'Yes, Reactivate Business'}
              </OwnButton>
            </div>
          </div>
        </div>
      )}

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Register New Business Tenant</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-foreground font-semibold mb-1">Company / Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Quantum Dynamics Corp"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-semibold mb-1">Official Legal Name</label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="Quantum Dynamics Pvt Ltd"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@quantum.in"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-semibold mb-1">Official Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-semibold mb-1">Auto Employee ID</label>
                  <select
                    value={formData.employee_id_enabled ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, employee_id_enabled: e.target.value === 'true' })}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-1">Employee ID Prefix</label>
                  <input
                    type="text"
                    value={formData.employee_id_prefix}
                    onChange={(e) => setFormData({ ...formData, employee_id_prefix: e.target.value.toUpperCase() })}
                    placeholder="QD"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
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
                  disabled={creating}
                >
                  {creating ? 'Registering...' : 'Register Business'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
