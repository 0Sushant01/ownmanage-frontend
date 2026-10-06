import React, { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserX,
  CalendarDays,
  TrendingUp,
  RefreshCw
} from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import apiClient from '../services/api'
import { SubscriptionUsageWidget } from '../components/SubscriptionUsageWidget'
import { SuperAdminDashboard } from './superadmin/SuperAdminDashboard'
import { CentreSelector } from '../components/CentreSelector'
import { OwnKpiCard } from '../design-system/components/OwnKpiCard'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnCard, OwnCardContent } from '../design-system/components/OwnCard'

interface EnterpriseStats {
  business_id: string
  business_name: string
  selected_centre_id?: string | null
  selected_centre_name?: string
  date: string
  total_centres: number
  active_centres: number
  total_employees: number
  active_employees: number
  present_today: number
  late_today: number
  half_day_today: number
  overtime_today: number
  on_leave: number
  absent_today: number
}

export const Dashboard: React.FC = () => {
  const { role, business } = useAuth()
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [stats, setStats] = useState<EnterpriseStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (role === 'SUPERADMIN' || role === 'BROKER') return
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (selectedCentre && selectedCentre !== 'all') {
        params.centre_id = selectedCentre
      }
      const res = await apiClient.get('/businesses/stats/', { params })
      setStats(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard operational analytics.')
    } finally {
      setLoading(false)
    }
  }, [role, selectedCentre])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (role === 'BROKER') {
    return <Navigate to="/broker/dashboard" replace />
  }

  if (role === 'SUPERADMIN') {
    return <SuperAdminDashboard />
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Enterprise Executive Header Card */}
      <OwnCard className="bg-card border-border shadow-md">
        <OwnCardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs uppercase font-mono tracking-wider text-primary font-bold">
                  {role === 'BUSINESS_ADMIN' ? 'Enterprise Workspace' : `${role} Workspace`}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {business?.name || 'Enterprise'} Overview
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Operational workforce, attendance, and centre analytics for today ({stats?.date || new Date().toISOString().split('T')[0]}).
              </p>
            </div>

            {/* Global Centre Selector & Refresh */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <CentreSelector
                value={selectedCentre}
                onChange={(val) => setSelectedCentre(val)}
                showAllOption={true}
              />
              <OwnButton
                onClick={() => fetchStats()}
                disabled={loading}
                variant="secondary"
                size="md"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                title="Refresh statistics"
              >
                Refresh
              </OwnButton>
            </div>
          </div>
        </OwnCardContent>
      </OwnCard>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards: 8 Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Centres */}
        <OwnKpiCard
          title="Centres"
          value={loading ? '—' : stats?.total_centres ?? 0}
          icon={<Building2 className="w-4 h-4" />}
          change={`${stats?.active_centres ?? 0} Active Centres`}
          variant="primary"
        />

        {/* Total Employees */}
        <OwnKpiCard
          title="Workforce"
          value={loading ? '—' : stats?.total_employees ?? 0}
          icon={<Users className="w-4 h-4" />}
          change={`${stats?.active_employees ?? 0} Active Staff`}
          variant="default"
        />

        {/* Present Today */}
        <OwnKpiCard
          title="Present Today"
          value={loading ? '—' : stats?.present_today ?? 0}
          icon={<CheckCircle2 className="w-4 h-4" />}
          change="Punched in & verified"
          variant="success"
        />

        {/* Late Today */}
        <OwnKpiCard
          title="Late Today"
          value={loading ? '—' : stats?.late_today ?? 0}
          icon={<Clock className="w-4 h-4" />}
          change="Past grace threshold"
          variant="warning"
        />

        {/* Overtime Today */}
        <OwnKpiCard
          title="Overtime Today"
          value={loading ? '—' : stats?.overtime_today ?? 0}
          icon={<TrendingUp className="w-4 h-4" />}
          change="Extended shift hours"
          variant="info"
        />

        {/* Half Day Today */}
        <OwnKpiCard
          title="Half Day"
          value={loading ? '—' : stats?.half_day_today ?? 0}
          icon={<AlertTriangle className="w-4 h-4" />}
          change="Partial work duration"
          variant="warning"
        />

        {/* On Leave */}
        <OwnKpiCard
          title="On Leave"
          value={loading ? '—' : stats?.on_leave ?? 0}
          icon={<CalendarDays className="w-4 h-4" />}
          change="Approved leave requests"
          variant="primary"
        />

        {/* Absent Today */}
        <OwnKpiCard
          title="Absent / Unmarked"
          value={loading ? '—' : stats?.absent_today ?? 0}
          icon={<UserX className="w-4 h-4" />}
          change="No shift punch recorded"
          variant="danger"
        />
      </div>

      {/* Subscription Usage Widget (For Enterprise Admins) */}
      {role === 'BUSINESS_ADMIN' && (
        <SubscriptionUsageWidget />
      )}
    </div>
  )
}

export default Dashboard
