import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import type { SuperAdminAnalyticsData } from '../../types'

type GrowthMetric = 'total' | 'new' | 'active' | 'churned'
type RevenueMetric = 'total_revenue' | 'paid_amount' | 'pending_amount'

export const SuperAdminDashboard: React.FC = () => {
  const [data, setData] = useState<SuperAdminAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [period, setPeriod] = useState('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [planId, setPlanId] = useState('all')
  const [businessStatus, setBusinessStatus] = useState('all')
  const [subscriptionStatus, setSubscriptionStatus] = useState('all')
  const [brokerId, setBrokerId] = useState('all')

  // Interactive Chart Metric Toggles
  const [growthMetric, setGrowthMetric] = useState<GrowthMetric>('total')
  const [revenueMetric, setRevenueMetric] = useState<RevenueMetric>('total_revenue')

  // Hover states for tooltips
  const [hoveredGrowthIdx, setHoveredGrowthIdx] = useState<number | null>(null)
  const [hoveredRevIdx, setHoveredRevIdx] = useState<number | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: Record<string, string> = {
        period,
        plan_id: planId,
        business_status: businessStatus,
        subscription_status: subscriptionStatus,
        broker_id: brokerId,
      }
      if (period === 'custom' && customStart && customEnd) {
        params.start_date = customStart
        params.end_date = customEnd
      }

      const res = await apiClient.get<SuperAdminAnalyticsData>('/analytics/superadmin/', { params })
      setData(res.data)
    } catch (err: any) {
      console.error('Failed to load SuperAdmin analytics:', err)
      setError(err.response?.data?.detail || 'Failed to load platform analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period, planId, businessStatus, subscriptionStatus, brokerId, customStart, customEnd])

  // Extract unique plans and brokers for filter dropdowns from payload or defaults
  const planOptions = useMemo(() => {
    return data?.plan_distribution || []
  }, [data])

  const brokerOptions = useMemo(() => {
    return data?.broker_performance || []
  }, [data])

  // Helper formatting INR
  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0'
    return '₹' + Number(val).toLocaleString('en-IN')
  }

  // Helper formatting relative time
  const formatTimeAgo = (isoString: string) => {
    try {
      const dt = new Date(isoString)
      const diffMs = Date.now() - dt.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    } catch {
      return isoString
    }
  }

  // --- SVG Chart Computations ---
  const renderGrowthChart = () => {
    const points = data?.growth_chart || []
    if (points.length === 0) return null

    const values = points.map((p) => p[growthMetric])
    const maxVal = Math.max(...values, 5)
    const minVal = 0

    const width = 640
    const height = 220
    const paddingX = 40
    const paddingY = 30
    const chartW = width - paddingX * 2
    const chartH = height - paddingY * 2

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * chartW
      const y = height - paddingY - ((p[growthMetric] - minVal) / (maxVal - minVal)) * chartH
      return { x, y, point: p, val: p[growthMetric] }
    })

    const pathD = coords.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`
      const prev = coords[idx - 1]
      const cpX = (prev.x + curr.x) / 2
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`
    }, '')

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`

    const metricColors: Record<GrowthMetric, { stroke: string; fill: string; dot: string }> = {
      total: { stroke: '#3b82f6', fill: 'url(#blueGrad)', dot: '#60a5fa' },
      new: { stroke: '#10b981', fill: 'url(#emeraldGrad)', dot: '#34d399' },
      active: { stroke: '#8b5cf6', fill: 'url(#purpleGrad)', dot: '#a78bfa' },
      churned: { stroke: '#f43f5e', fill: 'url(#roseGrad)', dot: '#fb7185' },
    }

    const col = metricColors[growthMetric]

    return (
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - paddingY - pct * chartH
            const valLabel = Math.round(minVal + pct * (maxVal - minVal))
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {valLabel}
                </text>
              </g>
            )
          })}

          {/* Filled Area */}
          <path d={areaD} fill={col.fill} />

          {/* Curved Line */}
          <path d={pathD} fill="none" stroke={col.stroke} strokeWidth="3" strokeLinecap="round" />

          {/* Points & Interactive Tooltips */}
          {coords.map((c, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredGrowthIdx(i)} onMouseLeave={() => setHoveredGrowthIdx(null)}>
              <circle
                cx={c.x}
                cy={c.y}
                r={hoveredGrowthIdx === i ? 6 : 4}
                fill="#0f172a"
                stroke={col.dot}
                strokeWidth={hoveredGrowthIdx === i ? 3 : 2}
                className="transition-all duration-150"
              />
              <text
                x={c.x}
                y={height - 8}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
                fontWeight="500"
              >
                {c.point.month}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredGrowthIdx !== null && coords[hoveredGrowthIdx] && (
          <div
            className="absolute -top-1 bg-slate-900 border border-slate-700 text-xs px-3 py-1.5 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2"
            style={{
              left: `${(coords[hoveredGrowthIdx].x / width) * 100}%`,
            }}
          >
            <div className="font-semibold text-white">{coords[hoveredGrowthIdx].point.month}</div>
            <div className="text-slate-300 font-mono">
              <span className="capitalize">{growthMetric}</span>: <strong className="text-emerald-400">{coords[hoveredGrowthIdx].val}</strong>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderRevenueChart = () => {
    const points = data?.revenue_chart || []
    if (points.length === 0) return null

    const values = points.map((p) => p[revenueMetric])
    const maxVal = Math.max(...values, 10000)
    const minVal = 0

    const width = 640
    const height = 220
    const paddingX = 55
    const paddingY = 30
    const chartW = width - paddingX * 2
    const chartH = height - paddingY * 2

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * chartW
      const y = height - paddingY - ((p[revenueMetric] - minVal) / (maxVal - minVal)) * chartH
      return { x, y, point: p, val: p[revenueMetric] }
    })

    const pathD = coords.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`
      const prev = coords[idx - 1]
      const cpX = (prev.x + curr.x) / 2
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`
    }, '')

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`

    const metricColors: Record<RevenueMetric, { stroke: string; fill: string; dot: string }> = {
      total_revenue: { stroke: '#10b981', fill: 'url(#revGradTotal)', dot: '#34d399' },
      paid_amount: { stroke: '#3b82f6', fill: 'url(#revGradPaid)', dot: '#60a5fa' },
      pending_amount: { stroke: '#f59e0b', fill: 'url(#revGradPending)', dot: '#fbbf24' },
    }

    const col = metricColors[revenueMetric]

    return (
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
          <defs>
            <linearGradient id="revGradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="revGradPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="revGradPending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = height - paddingY - pct * chartH
            const valLabel = Math.round(minVal + pct * (maxVal - minVal))
            const formatted = valLabel >= 1000 ? `₹${(valLabel / 1000).toFixed(0)}k` : `₹${valLabel}`
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {formatted}
                </text>
              </g>
            )
          })}

          <path d={areaD} fill={col.fill} />
          <path d={pathD} fill="none" stroke={col.stroke} strokeWidth="3" strokeLinecap="round" />

          {coords.map((c, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredRevIdx(i)} onMouseLeave={() => setHoveredRevIdx(null)}>
              <circle
                cx={c.x}
                cy={c.y}
                r={hoveredRevIdx === i ? 6 : 4}
                fill="#0f172a"
                stroke={col.dot}
                strokeWidth={hoveredRevIdx === i ? 3 : 2}
                className="transition-all duration-150"
              />
              <text
                x={c.x}
                y={height - 8}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
                fontWeight="500"
              >
                {c.point.month}
              </text>
            </g>
          ))}
        </svg>

        {hoveredRevIdx !== null && coords[hoveredRevIdx] && (
          <div
            className="absolute -top-1 bg-slate-900 border border-slate-700 text-xs px-3 py-1.5 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2"
            style={{
              left: `${(coords[hoveredRevIdx].x / width) * 100}%`,
            }}
          >
            <div className="font-semibold text-white">{coords[hoveredRevIdx].point.month}</div>
            <div className="text-slate-300 font-mono">
              <span>{revenueMetric.replace('_', ' ').toUpperCase()}</span>:{' '}
              <strong className="text-emerald-400">{formatINR(coords[hoveredRevIdx].val)}</strong>
            </div>
          </div>
        )}
      </div>
    )
  }

  const kpis = data?.kpis

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold">
              SUPERADMIN SAAS CONTROL CENTER
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Platform SaaS Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time business growth, recurring subscriptions, revenue collections, and partner commissions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/businesses"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            + Register Business
          </Link>
          <Link
            to="/plans"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/20"
          >
            Manage Plans
          </Link>
          <Link
            to="/brokers"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-amber-500/20"
          >
            Brokers & Payouts
          </Link>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <span>⚙️ Dashboard Filters</span>
            <span className="text-[11px] text-slate-500 font-normal">
              (All KPI numbers, graphs, and distribution tables react dynamically)
            </span>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1.5 transition"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Date Period Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Commercial Plan Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Commercial Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Plans</option>
              {planOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatINR(p.monthly_charge)}/mo)
                </option>
              ))}
            </select>
          </div>

          {/* Business Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Business Status</label>
            <select
              value={businessStatus}
              onChange={(e) => setBusinessStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Businesses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Suspended</option>
            </select>
          </div>

          {/* Subscription Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Subscription Status</label>
            <select
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Subscriptions</option>
              <option value="ACTIVE_PAID">Active Paid</option>
              <option value="TRIAL">Trial</option>
              <option value="PAYMENT_DUE">Payment Due</option>
              <option value="OVERDUE">Overdue</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Broker Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Broker Partner</label>
            <select
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Brokers</option>
              {brokerOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.referral_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/60 max-w-md">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-900 text-rose-300 text-sm p-4 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAnalytics} className="underline text-xs">Try Again</button>
        </div>
      )}

      {/* Main 6 KPI Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Total Businesses */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Businesses</span>
              <div className="text-3xl font-extrabold text-white mt-1.5">{kpis?.total_businesses ?? 0}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={`font-semibold ${((kpis?.business_growth_pct ?? 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                {((kpis?.business_growth_pct ?? 0) >= 0) ? '↑' : '↓'} {Math.abs(kpis?.business_growth_pct ?? 0)}%
              </span>
              <span className="text-[11px] text-slate-500 font-mono">+{kpis?.new_businesses ?? 0} new</span>
            </div>
          </div>

          {/* Card 2: Active Businesses */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Businesses</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1.5">{kpis?.active_businesses ?? 0}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">{kpis?.active_pct ?? 0}%</span>
              <span className="text-[11px] text-slate-500">operational</span>
            </div>
          </div>

          {/* Card 3: Platform Employees */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Platform Employees</span>
              <div className="text-3xl font-extrabold text-blue-400 mt-1.5">
                {(kpis?.total_employees ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={`font-semibold ${((kpis?.employee_growth_pct ?? 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                {((kpis?.employee_growth_pct ?? 0) >= 0) ? '↑' : '↓'} {Math.abs(kpis?.employee_growth_pct ?? 0)}%
              </span>
              <span className="text-[11px] text-slate-500">across centres</span>
            </div>
          </div>

          {/* Card 4: Subscription Revenue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subscription Rev</span>
              <div className="text-2xl font-extrabold text-purple-400 mt-1.5 truncate">
                {formatINR(kpis?.subscription_revenue)}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={`font-semibold ${((kpis?.revenue_growth_pct ?? 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                {((kpis?.revenue_growth_pct ?? 0) >= 0) ? '↑' : '↓'} {Math.abs(kpis?.revenue_growth_pct ?? 0)}%
              </span>
              <span className="text-[11px] text-slate-500">collected</span>
            </div>
          </div>

          {/* Card 5: Paid Subscriptions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid Accounts</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1.5">{kpis?.paid_subscriptions ?? 0}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">{kpis?.paid_pct ?? 0}%</span>
              <span className="text-[11px] text-slate-500">of businesses</span>
            </div>
          </div>

          {/* Card 6: Payment Due */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment Due</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-1.5">{kpis?.payment_due_count ?? 0}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-amber-400 font-medium truncate">{formatINR(kpis?.payment_due_amount)}</span>
              <span className="text-[11px] text-slate-500">pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Row: Business Growth Chart & Monthly Revenue Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Growth Line Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Business Growth Trajectory</h2>
              <span className="text-xs text-slate-400">6-Month historical trend by category</span>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              {(['total', 'new', 'active', 'churned'] as GrowthMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setGrowthMetric(m)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                    growthMetric === m
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {renderGrowthChart()}
        </div>

        {/* Monthly Subscription Revenue Trend Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Subscription Revenue Collections</h2>
              <span className="text-xs text-slate-400">Monthly billing collections & receivables</span>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              {(
                [
                  { key: 'total_revenue', label: 'Total' },
                  { key: 'paid_amount', label: 'Paid' },
                  { key: 'pending_amount', label: 'Due' },
                ] as { key: RevenueMetric; label: string }[]
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setRevenueMetric(m.key)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    revenueMetric === m.key
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {renderRevenueChart()}
        </div>
      </div>

      {/* Row: Subscription Status Breakdown & Paid vs Unpaid Revenue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Subscription Status & Revenue Realization</h2>
            <span className="text-xs text-slate-400">
              Breakdown across Trial, Active Paid, Payment Due, Overdue, Expired, and Suspended states
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">Paid:</span>
              <strong className="text-emerald-400">{formatINR(data?.status_breakdown.paid_revenue)}</strong>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-400">Pending / Due:</span>
              <strong className="text-amber-400">{formatINR(data?.status_breakdown.pending_revenue)}</strong>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar Distribution */}
        <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex">
          {data?.status_breakdown.statuses.map((s) => {
            if (s.count === 0) return null
            const colors: Record<string, string> = {
              ACTIVE_PAID: 'bg-emerald-500',
              TRIAL: 'bg-cyan-500',
              PAYMENT_DUE: 'bg-amber-400',
              OVERDUE: 'bg-rose-500',
              EXPIRED: 'bg-slate-600',
              SUSPENDED: 'bg-orange-500',
              CANCELLED: 'bg-red-700',
            }
            return (
              <div
                key={s.key}
                style={{ width: `${s.percentage}%` }}
                className={`${colors[s.key] || 'bg-slate-700'} h-full transition-all`}
                title={`${s.label}: ${s.count} (${s.percentage}%)`}
              />
            )
          })}
        </div>

        {/* Status Count Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {data?.status_breakdown.statuses.map((s) => {
            const borderColors: Record<string, string> = {
              ACTIVE_PAID: 'border-emerald-500/30 text-emerald-400',
              TRIAL: 'border-cyan-500/30 text-cyan-400',
              PAYMENT_DUE: 'border-amber-500/30 text-amber-400',
              OVERDUE: 'border-rose-500/30 text-rose-400',
              EXPIRED: 'border-slate-700 text-slate-400',
              SUSPENDED: 'border-orange-500/30 text-orange-400',
              CANCELLED: 'border-red-500/30 text-red-400',
            }
            return (
              <div
                key={s.key}
                className={`bg-slate-950/60 border ${borderColors[s.key] || 'border-slate-800 text-slate-300'} p-3 rounded-xl`}
              >
                <div className="text-[11px] font-medium uppercase truncate">{s.label}</div>
                <div className="text-xl font-bold text-white mt-1">{s.count}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{s.percentage}% of total</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row: Commercial Plan Distribution Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Commercial Plan Distribution</h2>
            <span className="text-xs text-slate-400">Enterprise adoption, center entitlements, and revenue per tier</span>
          </div>
          <Link to="/plans" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            Edit Pricing Plans →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Plan Tier</th>
                <th className="py-3 px-3">Monthly Charge</th>
                <th className="py-3 px-3">Centres Cap</th>
                <th className="py-3 px-3">Seat Pool</th>
                <th className="py-3 px-3">Total Enrolled</th>
                <th className="py-3 px-3">Active</th>
                <th className="py-3 px-3">Paid Subscriptions</th>
                <th className="py-3 px-3 text-right">Revenue Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.plan_distribution.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3 font-semibold text-white">
                    <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-800/60 rounded-md text-purple-300">
                      {plan.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{formatINR(plan.monthly_charge)}</td>
                  <td className="py-3 px-3 text-slate-400">{plan.max_centres} branches</td>
                  <td className="py-3 px-3 text-slate-400">{plan.total_capacity} seats</td>
                  <td className="py-3 px-3 font-bold text-white">{plan.businesses_count}</td>
                  <td className="py-3 px-3 text-emerald-400">{plan.active_count}</td>
                  <td className="py-3 px-3 text-blue-400 font-semibold">{plan.paid_count}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatINR(plan.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row: 2 Columns: Action Required + Broker Performance Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Required Operational Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-base">⚠️</span>
              <h2 className="text-base font-bold text-white">Action Required & Operational Alerts</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Items requiring SuperAdmin resolution or follow-up:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-rose-900/40">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <div>
                    <span className="text-xs font-semibold text-rose-300">
                      {data?.action_required.payments_overdue_count ?? 0} Overdue Invoices
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Totaling {formatINR(data?.action_required.payments_overdue_amount)}
                    </span>
                  </div>
                </div>
                <Link
                  to="/businesses"
                  className="text-[11px] bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-800/60 transition"
                >
                  Review Invoices →
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-amber-900/40">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <div>
                    <span className="text-xs font-semibold text-amber-300">
                      {data?.action_required.subscriptions_expiring_soon ?? 0} Subscriptions Expiring in 7 Days
                    </span>
                    <span className="text-[10px] text-slate-500 block">Approaching billing renewal</span>
                  </div>
                </div>
                <Link
                  to="/businesses"
                  className="text-[11px] bg-amber-950/80 hover:bg-amber-900 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-800/60 transition"
                >
                  View Accounts →
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-purple-900/40">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <div>
                    <span className="text-xs font-semibold text-purple-300">
                      {data?.action_required.commissions_pending_count ?? 0} Broker Commissions Accruing
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Pending payout: {formatINR(data?.action_required.commissions_pending_amount)}
                    </span>
                  </div>
                </div>
                <Link
                  to="/brokers"
                  className="text-[11px] bg-purple-950/80 hover:bg-purple-900 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-800/60 transition"
                >
                  Approve Payouts →
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <div>
                    <span className="text-xs font-semibold text-cyan-300">
                      {data?.action_required.trials_count ?? 0} Businesses on Trial
                    </span>
                    <span className="text-[10px] text-slate-500 block">Trial conversion opportunities</span>
                  </div>
                </div>
                <Link
                  to="/businesses"
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
                >
                  Follow Up →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Broker Partner Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-base">🤝</span>
                <h2 className="text-base font-bold text-white">Broker Partner Performance</h2>
              </div>
              <Link to="/brokers" className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
                View All Partners →
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Top channel partners driving enterprise tenant onboarding:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-2">Partner Name</th>
                    <th className="py-2 px-2">Code</th>
                    <th className="py-2 px-2">Clients</th>
                    <th className="py-2 px-2">Revenue</th>
                    <th className="py-2 px-2 text-right">Commissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.broker_performance.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-2 font-semibold text-white">{b.name}</td>
                      <td className="py-2.5 px-2 font-mono text-amber-400">{b.referral_code}</td>
                      <td className="py-2.5 px-2 text-slate-300">
                        {b.active_businesses} / {b.referred_businesses}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-300">{formatINR(b.total_revenue)}</td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="text-emerald-400 font-mono block">{formatINR(b.commissions_paid)}</span>
                        {b.commissions_pending > 0 && (
                          <span className="text-[10px] text-amber-400 font-mono block">
                            +{formatINR(b.commissions_pending)} due
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Recent Platform Activity Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚡</span>
            <h2 className="text-base font-bold text-white">Recent Platform Activity</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Live audit timeline</span>
        </div>

        <div className="space-y-3">
          {data?.recent_activity.map((act) => {
            const dotColors: Record<string, string> = {
              emerald: 'bg-emerald-500 ring-emerald-500/20',
              blue: 'bg-blue-500 ring-blue-500/20',
              purple: 'bg-purple-500 ring-purple-500/20',
              amber: 'bg-amber-500 ring-amber-500/20',
            }
            return (
              <div
                key={act.id}
                className="flex items-start justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-start space-x-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ring-4 ${dotColors[act.status_color] || 'bg-slate-500 ring-slate-500/20'}`}
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">{act.title}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">{act.description}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap ml-4">
                  {formatTimeAgo(act.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
