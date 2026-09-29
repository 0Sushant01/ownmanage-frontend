import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../services/api'
import type { Business, Plan } from '../types'

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
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold">
              SUPERADMIN TENANT MANAGEMENT
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Business Directory</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Complete management table of all enterprise tenants, commercial subscriptions, capacities, and partners.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredBusinesses.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
            title="Download directory as CSV"
          >
            <span>📥 Export CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-1"
          >
            <span>+ Register Business</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Live Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Search Directory</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, ID, email, or phone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Commercial Plan</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Partner Broker</label>
            <select
              value={brokerFilter}
              onChange={(e) => setBrokerFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
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

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{filteredBusinesses.length}</strong> of{' '}
            <strong className="text-slate-300">{businesses.length}</strong> businesses
          </span>
          {(searchQuery || statusFilter !== 'ALL' || planFilter !== 'ALL' || brokerFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('ALL')
                setPlanFilter('ALL')
                setBrokerFilter('ALL')
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-rose-950/40 border border-rose-900 text-rose-300 p-4 rounded-xl text-sm">{error}</div>}

      {/* Main 15-Column Business Management Table */}
      {loading ? (
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-slate-500 text-sm">
          Loading comprehensive business directory...
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
          No businesses found matching the selected filter criteria.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
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
              <tbody className="divide-y divide-slate-800/60">
                {filteredBusinesses.map((b) => {
                  const days = b.days_remaining ?? 0
                  const daysBadgeColor =
                    days <= 3
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : days <= 7
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-slate-800 text-slate-300 border-slate-700'

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      {/* 1. Name & ID */}
                      <td className="px-4 py-3 font-semibold text-white">
                        <Link to={`/businesses/${b.id}`} className="hover:text-emerald-400 transition block font-bold">
                          {b.name}
                        </Link>
                        <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[130px]">
                          ID: {b.id.slice(0, 8)}...
                        </span>
                      </td>

                      {/* 2. Plan */}
                      <td className="px-4 py-3 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-purple-300 text-[11px] whitespace-nowrap">
                          {b.current_plan_name || 'No Plan'}
                        </span>
                      </td>

                      {/* 3. Subscription Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            b.subscription_status === 'ACTIVE' || b.subscription_status === 'ACTIVE_PAID'
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                              : b.subscription_status === 'TRIAL'
                              ? 'bg-cyan-950/60 border-cyan-800 text-cyan-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {b.subscription_status || 'INACTIVE'}
                        </span>
                      </td>

                      {/* 4. Payment Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            b.payment_status === 'PAID'
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                              : b.payment_status === 'OVERDUE'
                              ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                              : 'bg-amber-950/80 border-amber-800 text-amber-300'
                          }`}
                        >
                          {b.payment_status || 'UNBILLED'}
                        </span>
                      </td>

                      {/* 5. Expiry Date */}
                      <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                        {b.expiry_date || '—'}
                      </td>

                      {/* 6. Days Left */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.expiry_date ? (
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold ${daysBadgeColor}`}>
                            {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* 7. Total Centres */}
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {b.total_centres ?? 0}
                      </td>

                      {/* 8. Employee Capacity */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">
                        {b.employee_capacity ?? 0} seats
                      </td>

                      {/* 9. Active Employees */}
                      <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                        {b.active_employees_count ?? 0}
                      </td>

                      {/* 10. Managers */}
                      <td className="px-4 py-3 font-mono text-blue-400">
                        {b.managers_count ?? 0}
                      </td>

                      {/* 11. Broker */}
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {b.broker_name ? (
                          <span className="text-amber-400 font-medium">
                            {b.broker_name} <span className="font-mono text-[10px] text-slate-400">({b.broker_code})</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Direct</span>
                        )}
                      </td>

                      {/* 12. Business Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            b.is_active
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                              : 'bg-rose-950/60 border-rose-800 text-rose-400'
                          }`}
                        >
                          {b.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* 13. Actions */}
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          to={`/businesses/${b.id}`}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-800 transition font-medium"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedBizForPlan(b)
                            setSelectedNewPlanId(b.current_plan_id || '')
                          }}
                          className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 rounded-lg border border-purple-800/60 transition font-medium"
                        >
                          Plan
                        </button>
                        <button
                          onClick={() => setSelectedBizForStatus(b)}
                          className={`px-2 py-1 rounded-lg border transition font-medium ${
                            b.is_active
                              ? 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border-rose-900/60'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border-emerald-900/60'
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
        </div>
      )}

      {/* Change Plan Modal (Section 13) */}
      {selectedBizForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Change Subscription Plan</h3>
                <p className="text-xs text-slate-400">Upgrade or downgrade {selectedBizForPlan.name}&apos;s entitlement tier.</p>
              </div>
              <button onClick={() => setSelectedBizForPlan(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleChangePlanSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Plan:</span>
                  <strong className="text-purple-400">{selectedBizForPlan.current_plan_name || 'No Plan'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Employee Capacity:</span>
                  <strong className="text-slate-200">{selectedBizForPlan.employee_capacity || 0} seats</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Currently Active Employees:</span>
                  <strong className="text-emerald-400">{selectedBizForPlan.active_employees_count || 0} employees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Centres:</span>
                  <strong className="text-slate-200">{selectedBizForPlan.total_centres || 0} centres</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select New Commercial Plan *</label>
                <select
                  required
                  value={selectedNewPlanId}
                  onChange={(e) => setSelectedNewPlanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
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
                <label className="block text-slate-300 font-semibold mb-1">Administrative Reason / Notes</label>
                <input
                  type="text"
                  value={changePlanReason}
                  onChange={(e) => setChangePlanReason(e.target.value)}
                  placeholder="e.g. Requested mid-cycle enterprise capacity expansion"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBizForPlan(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPlan || !selectedNewPlanId}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {changingPlan ? 'Applying Plan Change...' : 'Confirm & Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate Modal (Section 35) */}
      {selectedBizForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {selectedBizForStatus.is_active ? '⚠️ Deactivate Business Tenant' : '✅ Reactivate Business Tenant'}
              </h3>
              <button onClick={() => setSelectedBizForStatus(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                <strong>Business:</strong> {selectedBizForStatus.name} ({selectedBizForStatus.current_plan_name})
              </p>
              <p>
                <strong>Active Staff:</strong> {selectedBizForStatus.active_employees_count} employees across {selectedBizForStatus.total_centres} centres.
              </p>
              {selectedBizForStatus.is_active ? (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300">
                  <strong>Warning:</strong> Deactivating this business will immediately block all its business administrators, managers, and staff members from accessing OwnManage. Historical payroll and attendance records will remain preserved.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300">
                  Reactivating this business will restore full access for its administrators and staff members according to their subscription plan.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedBizForStatus(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusSubmit}
                disabled={updatingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                  selectedBizForStatus.is_active
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {updatingStatus
                  ? 'Updating...'
                  : selectedBizForStatus.is_active
                  ? 'Yes, Deactivate Business'
                  : 'Yes, Reactivate Business'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Register New Business Tenant</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Quantum Dynamics Corp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Legal Name</label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="Quantum Dynamics Pvt Ltd"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@quantum.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Auto Employee ID</label>
                  <select
                    value={formData.employee_id_enabled ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, employee_id_enabled: e.target.value === 'true' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Employee ID Prefix</label>
                  <input
                    type="text"
                    value={formData.employee_id_prefix}
                    onChange={(e) => setFormData({ ...formData, employee_id_prefix: e.target.value.toUpperCase() })}
                    placeholder="QD"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {creating ? 'Registering...' : 'Register Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
