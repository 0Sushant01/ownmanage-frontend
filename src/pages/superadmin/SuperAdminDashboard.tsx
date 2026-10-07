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

  // Subscribers Modal Drilldown
  const [selectedPlanForSubs, setSelectedPlanForSubs] = useState<{ id: string; name: string } | null>(null)
  const [subscribersData, setSubscribersData] = useState<any | null>(null)
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [subsError, setSubsError] = useState<string | null>(null)

  const openSubscribersModal = async (plan: { id: string; name: string }) => {
    setSelectedPlanForSubs(plan)
    setSubscribersData(null)
    setSubsError(null)
    setLoadingSubs(true)

    try {
      const res = await apiClient.get(`/plans/${plan.id}/subscribers/`)
      setSubscribersData(res.data)
    } catch (err: any) {
      setSubsError(err.response?.data?.detail || 'Failed to load subscriber businesses.')
    } finally {
      setLoadingSubs(false)
    }
  }

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
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3.5}
                  fill="currentColor"
                  className="text-muted-foreground"
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
                className="fill-card"
                stroke={col.dot}
                strokeWidth={hoveredGrowthIdx === i ? 3 : 2}
              />
              <text
                x={c.x}
                y={height - 8}
                fill="currentColor"
                className="text-muted-foreground font-medium"
                fontSize="11"
                textAnchor="middle"
              >
                {c.point.month}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredGrowthIdx !== null && coords[hoveredGrowthIdx] && (
          <div
            className="absolute -top-1 bg-card border border-border text-foreground text-xs px-3 py-1.5 rounded-xl shadow-xl pointer-events-none transform -translate-x-1/2"
            style={{
              left: `${(coords[hoveredGrowthIdx].x / width) * 100}%`,
            }}
          >
            <div className="font-semibold text-foreground">{coords[hoveredGrowthIdx].point.month}</div>
            <div className="text-muted-foreground font-mono">
              <span className="capitalize">{growthMetric}</span>: <strong className="text-primary">{coords[hoveredGrowthIdx].val}</strong>
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
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3.5}
                  fill="currentColor"
                  className="text-muted-foreground"
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
                className="fill-card"
                stroke={col.dot}
                strokeWidth={hoveredRevIdx === i ? 3 : 2}
              />
              <text
                x={c.x}
                y={height - 8}
                fill="currentColor"
                className="text-muted-foreground font-medium"
                fontSize="11"
                textAnchor="middle"
              >
                {c.point.month}
              </text>
            </g>
          ))}
        </svg>

        {hoveredRevIdx !== null && coords[hoveredRevIdx] && (
          <div
            className="absolute -top-1 bg-card border border-border text-foreground text-xs px-3 py-1.5 rounded-xl shadow-xl pointer-events-none transform -translate-x-1/2"
            style={{
              left: `${(coords[hoveredRevIdx].x / width) * 100}%`,
            }}
          >
            <div className="font-semibold text-foreground">{coords[hoveredRevIdx].point.month}</div>
            <div className="text-muted-foreground font-mono">
              <span>{revenueMetric.replace('_', ' ').toUpperCase()}</span>:{' '}
              <strong className="text-primary">{formatINR(coords[hoveredRevIdx].val)}</strong>
            </div>
          </div>
        )}
      </div>
    )
  }

  const kpis = data?.kpis

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-primary font-bold">
              SUPERADMIN SAAS CONTROL CENTER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Platform SaaS Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time business growth, recurring subscriptions, revenue collections, and partner commissions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/businesses"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            + Register Business
          </Link>
          <Link
            to="/plans"
            className="bg-card hover:bg-muted text-foreground border border-border font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            Manage Plans
          </Link>
          <Link
            to="/brokers"
            className="bg-card hover:bg-muted text-foreground border border-border font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            Brokers & Payouts
          </Link>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-foreground">
            <span>⚙️ Dashboard Filters</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              (All KPI numbers, graphs, and distribution tables react dynamically)
            </span>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-primary flex items-center space-x-1.5 transition cursor-pointer"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Date Period Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring hover:border-border-strong cursor-pointer shadow-xs min-h-8.5"
            >
              <option value="today" className="bg-card text-foreground">Today</option>
              <option value="this_week" className="bg-card text-foreground">This Week</option>
              <option value="this_month" className="bg-card text-foreground">This Month</option>
              <option value="last_month" className="bg-card text-foreground">Last Month</option>
              <option value="last_3_months" className="bg-card text-foreground">Last 3 Months</option>
              <option value="last_6_months" className="bg-card text-foreground">Last 6 Months</option>
              <option value="this_year" className="bg-card text-foreground">This Year</option>
              <option value="last_year" className="bg-card text-foreground">Last Year</option>
              <option value="custom" className="bg-card text-foreground">Custom Range</option>
            </select>
          </div>

          {/* Commercial Plan Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Commercial Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring hover:border-border-strong cursor-pointer shadow-xs min-h-8.5"
            >
              <option value="all" className="bg-card text-foreground">All Plans</option>
              {planOptions.map((p) => (
                <option key={p.id} value={p.id} className="bg-card text-foreground">
                  {p.name} ({formatINR(p.monthly_charge)}/mo)
                </option>
              ))}
            </select>
          </div>

          {/* Business Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Business Status</label>
            <select
              value={businessStatus}
              onChange={(e) => setBusinessStatus(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring hover:border-border-strong cursor-pointer shadow-xs min-h-8.5"
            >
              <option value="all" className="bg-card text-foreground">All Businesses</option>
              <option value="active" className="bg-card text-foreground">Active Only</option>
              <option value="inactive" className="bg-card text-foreground">Inactive / Suspended</option>
            </select>
          </div>

          {/* Subscription Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Subscription Status</label>
            <select
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring hover:border-border-strong cursor-pointer shadow-xs min-h-8.5"
            >
              <option value="all" className="bg-card text-foreground">All Subscriptions</option>
              <option value="ACTIVE_PAID" className="bg-card text-foreground">Active Paid</option>
              <option value="TRIAL" className="bg-card text-foreground">Trial</option>
              <option value="PAYMENT_DUE" className="bg-card text-foreground">Payment Due</option>
              <option value="OVERDUE" className="bg-card text-foreground">Overdue</option>
              <option value="EXPIRED" className="bg-card text-foreground">Expired</option>
              <option value="SUSPENDED" className="bg-card text-foreground">Suspended</option>
              <option value="CANCELLED" className="bg-card text-foreground">Cancelled</option>
            </select>
          </div>

          {/* Broker Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Broker Partner</label>
            <select
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring hover:border-border-strong cursor-pointer shadow-xs min-h-8.5"
            >
              <option value="all" className="bg-card text-foreground">All Brokers</option>
              {brokerOptions.map((b) => (
                <option key={b.id} value={b.id} className="bg-card text-foreground">
                  {b.name} ({b.referral_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border max-w-md">
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-4 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAnalytics} className="underline text-xs cursor-pointer">Try Again</button>
        </div>
      )}

      {/* Main 6 KPI Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Total Businesses */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-border-strong transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Businesses</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1.5">{kpis?.total_businesses ?? 0}</div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="text-primary font-semibold">{kpis?.active_businesses ?? 0}</span> active ·{' '}
              <span className="text-muted-foreground">{kpis?.inactive_businesses ?? 0} inactive</span>
              <div className="text-[11px] text-muted-foreground/75 mt-0.5">({kpis?.active_pct ?? 0}% operational)</div>
            </div>
          </div>

          {/* Card 2: Active Subscriptions */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-border-strong transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Subscriptions</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-primary mt-1.5">
                {kpis?.active_subscriptions ?? kpis?.paid_subscriptions ?? 0}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="text-warning font-semibold">{kpis?.expiring_soon_subscriptions ?? 0}</span> expiring soon
              <div className="text-[11px] text-muted-foreground/75 mt-0.5">{kpis?.expired_subscriptions ?? 0} expired accounts</div>
            </div>
          </div>

          {/* Card 3: Platform Employees */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-border-strong transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Employees</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1.5">
                {(kpis?.total_employees ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="text-primary font-semibold">{kpis?.active_employees ?? 0}</span> active staff
              <div className="text-[11px] text-muted-foreground/75 mt-0.5">{kpis?.inactive_employees ?? 0} archived across centres</div>
            </div>
          </div>

          {/* Card 4: Monthly Revenue */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-border-strong transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Revenue</span>
              <div className="text-xl sm:text-2xl font-extrabold text-foreground mt-1.5 truncate">
                {formatINR(kpis?.monthly_revenue ?? kpis?.subscription_revenue)}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className={`font-semibold ${((kpis?.revenue_growth_pct ?? 0) >= 0) ? 'text-primary' : 'text-destructive'}`}>
                {((kpis?.revenue_growth_pct ?? 0) >= 0) ? '↑' : '↓'} {Math.abs(kpis?.revenue_growth_pct ?? 0)}%
              </span>{' '}
              vs last month
              <div className="text-[11px] text-muted-foreground/75 mt-0.5">collected this period</div>
            </div>
          </div>

          {/* Card 5: Pending Payments */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-border-strong transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending Payments</span>
              <div className="text-xl sm:text-2xl font-extrabold text-warning mt-1.5 truncate">
                {formatINR(kpis?.payment_due_amount)}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="text-warning font-bold">{kpis?.payment_due_businesses_count ?? kpis?.payment_due_count ?? 0}</span> businesses
              <div className="text-[11px] text-muted-foreground/75 mt-0.5">overdue / pending billing</div>
            </div>
          </div>

          {/* Card 6: Broker Commission Payable */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-border-strong transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Broker Commissions</span>
              <div className="text-xl sm:text-2xl font-extrabold text-foreground mt-1.5 truncate">
                {formatINR(kpis?.broker_commission_payable)}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="text-warning font-bold">{kpis?.broker_commission_payable_count ?? 0}</span> partners
              <div className="text-[11px] text-muted-foreground/75 mt-0.5">awaiting commission payout</div>
            </div>
          </div>
        </div>
      )}

      {/* Row: Business Growth Chart & Monthly Revenue Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Growth Line Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Business Growth Trajectory</h2>
              <span className="text-xs text-muted-foreground">6-Month historical trend by category</span>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-[11px]">
              {(['total', 'new', 'active', 'churned'] as GrowthMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setGrowthMetric(m)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition cursor-pointer ${
                    growthMetric === m
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
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
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Subscription Revenue Collections</h2>
              <span className="text-xs text-muted-foreground">Monthly billing collections & receivables</span>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-[11px]">
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
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    revenueMetric === m.key
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
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
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Subscription Status & Revenue Realization</h2>
            <span className="text-xs text-muted-foreground">
              Breakdown across Trial, Active Paid, Payment Due, Overdue, Expired, and Suspended states
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Paid:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(data?.status_breakdown.paid_revenue)}</strong>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Pending / Due:</span>
              <strong className="text-amber-600 dark:text-amber-400">{formatINR(data?.status_breakdown.pending_revenue)}</strong>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar Distribution */}
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
          {data?.status_breakdown.statuses.map((s) => {
            if (s.count === 0) return null
            const colors: Record<string, string> = {
              ACTIVE_PAID: 'bg-emerald-500',
              TRIAL: 'bg-cyan-500',
              PAYMENT_DUE: 'bg-amber-400',
              OVERDUE: 'bg-rose-500',
              EXPIRED: 'bg-slate-400 dark:bg-slate-600',
              SUSPENDED: 'bg-orange-500',
              CANCELLED: 'bg-red-600',
            }
            return (
              <div
                key={s.key}
                style={{ width: `${s.percentage}%` }}
                className={`${colors[s.key] || 'bg-muted-foreground'} h-full transition-all`}
                title={`${s.label}: ${s.count} (${s.percentage}%)`}
              />
            )
          })}
        </div>

        {/* Status Count Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {data?.status_breakdown.statuses.map((s) => {
            const badgeClasses: Record<string, string> = {
              ACTIVE_PAID: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
              TRIAL: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400',
              PAYMENT_DUE: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
              OVERDUE: 'border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400',
              EXPIRED: 'border-border bg-muted/30 text-muted-foreground',
              SUSPENDED: 'border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400',
              CANCELLED: 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400',
            }
            return (
              <div
                key={s.key}
                className={`border ${badgeClasses[s.key] || 'border-border bg-muted/20 text-muted-foreground'} p-3 rounded-xl`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider truncate">{s.label}</div>
                <div className="text-xl font-bold text-foreground mt-1">{s.count}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.percentage}% of total</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row: Subscriptions Expiring Soon (Section 10 Urgency Table) */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base">⏳</span>
              <h2 className="text-base font-bold text-foreground">Subscriptions Expiring Soon (Next 30 Days)</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tenants nearing subscription expiration sorted by renewal urgency (Critical: 0-3d, Warning: 4-7d, Upcoming: 8-30d).
            </p>
          </div>
          <Link to="/businesses" className="text-xs text-primary hover:underline font-semibold">
            View All Businesses →
          </Link>
        </div>

        {(!data?.expiring_subscriptions || data.expiring_subscriptions.length === 0) ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No subscriptions are expiring within the next 30 days. All active enterprise tenants are in good standing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Enterprise Tenant</th>
                  <th className="p-3">Commercial Plan</th>
                  <th className="p-3">Expiration Date</th>
                  <th className="p-3">Days Remaining</th>
                  <th className="p-3">Urgency Tier</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {data.expiring_subscriptions.map((sub) => {
                  const urgencyBadge = {
                    critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse',
                    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30',
                    upcoming: 'bg-primary/10 text-primary border border-primary/30',
                  }[sub.urgency] || 'bg-muted text-muted-foreground'

                  return (
                    <tr key={sub.id} className="hover:bg-muted/30 transition">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{sub.business_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{sub.business_email}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-medium">
                          {sub.plan_name}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{sub.expiry_date}</td>
                      <td className="p-3 font-mono font-bold text-foreground">
                        {sub.days_remaining} {sub.days_remaining === 1 ? 'day' : 'days'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${urgencyBadge}`}>
                          {sub.urgency}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          to={`/businesses/${sub.business_id}`}
                          className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row: Commercial Plan Distribution Table with Subscriber Drilldown */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Commercial Plan Distribution</h2>
            <span className="text-xs text-muted-foreground">Enterprise adoption, center entitlements, and subscriber drilldowns</span>
          </div>
          <Link to="/plans" className="text-xs text-primary hover:underline font-semibold">
            Edit Pricing Plans →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
              <tr>
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
            <tbody className="divide-y divide-border text-foreground">
              {data?.plan_distribution.map((plan) => (
                <tr key={plan.id} className="hover:bg-muted/30 transition">
                  <td className="py-3 px-3 font-semibold text-foreground">
                    <button
                      onClick={() => openSubscribersModal(plan)}
                      className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md text-primary font-semibold transition text-left cursor-pointer"
                    >
                      {plan.name} ↗
                    </button>
                  </td>
                  <td className="py-3 px-3 font-mono text-muted-foreground">{formatINR(plan.monthly_charge)}</td>
                  <td className="py-3 px-3 text-muted-foreground">{plan.max_centres} branches</td>
                  <td className="py-3 px-3 text-muted-foreground">{plan.total_capacity} seats</td>
                  <td className="py-3 px-3 font-bold text-foreground">
                    <button
                      onClick={() => openSubscribersModal(plan)}
                      className="text-primary hover:underline font-bold cursor-pointer"
                    >
                      {plan.businesses_count}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">{plan.active_count}</td>
                  <td className="py-3 px-3 text-blue-600 dark:text-blue-400 font-semibold">{plan.paid_count}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-base">⚠️</span>
              <h2 className="text-base font-bold text-foreground">Action Required & Operational Alerts</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Items requiring SuperAdmin resolution or follow-up:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <div>
                    <span className="text-xs font-semibold text-destructive">
                      {data?.action_required.payments_overdue_count ?? 0} Overdue Invoices
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Totaling {formatINR(data?.action_required.payments_overdue_amount)}
                    </span>
                  </div>
                </div>
                <Link
                  to="/businesses"
                  className="text-[11px] bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold px-3 py-1.5 rounded-lg border border-destructive/30 transition"
                >
                  Review Invoices →
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <div>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {data?.action_required.subscriptions_expiring_soon ?? 0} Subscriptions Expiring in 7 Days
                    </span>
                    <span className="text-[10px] text-muted-foreground block">Approaching billing renewal</span>
                  </div>
                </div>
                <Link
                  to="/businesses"
                  className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold px-3 py-1.5 rounded-lg border border-amber-500/30 transition"
                >
                  View Accounts →
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <span className="text-xs font-semibold text-primary">
                      {data?.action_required.commissions_pending_count ?? 0} Broker Commissions Accruing
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Pending payout: {formatINR(data?.action_required.commissions_pending_amount)}
                    </span>
                  </div>
                </div>
                <Link
                  to="/brokers"
                  className="text-[11px] bg-primary/10 hover:bg-primary/20 text-primary font-semibold px-3 py-1.5 rounded-lg border border-primary/30 transition"
                >
                  Approve Payouts →
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center space-x-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      {data?.action_required.trials_count ?? 0} Businesses on Trial
                    </span>
                    <span className="text-[10px] text-muted-foreground block">Trial conversion opportunities</span>
                  </div>
                </div>
                <Link
                  to="/businesses"
                  className="text-[11px] bg-muted hover:bg-muted/80 text-foreground font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  Follow Up →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Broker Partner Summary */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-base">🤝</span>
                <h2 className="text-base font-bold text-foreground">Broker Partner Performance</h2>
              </div>
              <Link to="/brokers" className="text-xs text-primary hover:underline font-semibold">
                View All Partners →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Top channel partners driving enterprise tenant onboarding:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground text-[10px] font-mono uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Partner Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Clients</th>
                    <th className="py-2.5 px-3">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Commissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {data?.broker_performance.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30 transition">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{b.name}</td>
                      <td className="py-2.5 px-3 font-mono text-primary font-bold">{b.referral_code}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {b.active_businesses} / {b.referred_businesses}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{formatINR(b.total_revenue)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold block">{formatINR(b.commissions_paid)}</span>
                        {b.commissions_pending > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block">
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
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚡</span>
            <h2 className="text-base font-bold text-foreground">Recent Platform Activity</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Live audit timeline</span>
        </div>

        <div className="space-y-3">
          {data?.recent_activity.map((act) => {
            const dotColors: Record<string, string> = {
              emerald: 'bg-emerald-500 ring-emerald-500/20',
              blue: 'bg-blue-500 ring-blue-500/20',
              purple: 'bg-primary ring-primary/20',
              amber: 'bg-amber-500 ring-amber-500/20',
            }
            return (
              <div
                key={act.id}
                className="flex items-start justify-between p-3.5 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition"
              >
                <div className="flex items-start space-x-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ring-4 ${dotColors[act.status_color] || 'bg-muted-foreground ring-muted'}`}
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">{act.title}</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">{act.description}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap ml-4">
                  {formatTimeAgo(act.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan Subscribers Modal Drilldown */}
      {selectedPlanForSubs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Subscribers of {selectedPlanForSubs.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Businesses enrolled in this commercial tier.
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
            ) : (!subscribersData?.subscribers || subscribersData.subscribers.length === 0) ? (
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
                      <th className="p-3">Active Seats</th>
                      <th className="p-3">Days Left</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {subscribersData.subscribers.map((sub: any) => (
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
              <button
                type="button"
                onClick={() => setSelectedPlanForSubs(null)}
                className="rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer transition"
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
