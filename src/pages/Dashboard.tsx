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
    <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400">
              {role === 'BUSINESS_ADMIN' ? 'Enterprise Workspace' : `${role} Workspace`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {business?.name || 'Enterprise'} Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
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
          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards: 9 Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Centres */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Centres</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '—' : stats?.total_centres ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {loading ? '' : `${stats?.active_centres ?? 0} Active Centres`}
          </div>
        </div>

        {/* Total Employees */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Workforce</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '—' : stats?.total_employees ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {loading ? '' : `${stats?.active_employees ?? 0} Active Staff`}
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-emerald-400 flex items-center justify-between">
            <span>Present Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">
            {loading ? '—' : stats?.present_today ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Punched in & verified</div>
        </div>

        {/* Late Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-amber-400 flex items-center justify-between">
            <span>Late Today</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">
            {loading ? '—' : stats?.late_today ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Past grace threshold</div>
        </div>

        {/* Overtime Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-indigo-400 flex items-center justify-between">
            <span>Overtime Today</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300">
            {loading ? '—' : stats?.overtime_today ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Extended shift hours</div>
        </div>

        {/* Half Day Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-yellow-400 flex items-center justify-between">
            <span>Half Day</span>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-300">
            {loading ? '—' : stats?.half_day_today ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Partial work duration</div>
        </div>

        {/* On Leave */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-blue-400 flex items-center justify-between">
            <span>On Leave</span>
            <CalendarDays className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300">
            {loading ? '—' : stats?.on_leave ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Approved leave requests</div>
        </div>

        {/* Absent Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs font-medium text-rose-400 flex items-center justify-between">
            <span>Absent / Unmarked</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300">
            {loading ? '—' : stats?.absent_today ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">No shift punch recorded</div>
        </div>
      </div>

      {/* Subscription Usage Widget (For Enterprise Admins) */}
      {role === 'BUSINESS_ADMIN' && (
        <SubscriptionUsageWidget />
      )}
    </div>
  )
}

export default Dashboard
