import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiClient from '../services/api'
import { SubscriptionUsageWidget } from '../components/SubscriptionUsageWidget'
import { SuperAdminDashboard } from './superadmin/SuperAdminDashboard'

interface Stats {
  total_businesses?: number
  active_businesses?: number
  total_managers?: number
  total_employees?: number
  present_today?: number
  absent_today?: number
  on_leave?: number
}

export const Dashboard: React.FC = () => {
  const { user, role, business } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (role === 'SUPERADMIN' || role === 'BROKER') return

    const fetchStats = async () => {
      try {
        setLoading(true)
        const res = await apiClient.get('/businesses/stats/')
        setStats(res.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard metrics.')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [role])

  if (role === 'BROKER') {
    return <Navigate to="/broker/dashboard" replace />
  }

  if (role === 'SUPERADMIN') {
    return <SuperAdminDashboard />
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400">
              {role} Workspace
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.first_name || 'Admin'}
          </h1>
          <p className="text-sm text-slate-400">
            {business?.name || 'Company'} — Real-time attendance & staff overview
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {role === 'BUSINESS_ADMIN' && (
            <Link
              to="/employees"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10"
            >
              + Add Employee
            </Link>
          )}
          {role === 'MANAGER' && (
            <Link
              to="/leaves"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10"
            >
              Review Leaves
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-950/40 border border-rose-900 text-rose-300 text-sm p-4 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              {role === 'MANAGER' ? 'My Staff' : 'Total Employees'}
            </span>
            <div className="text-3xl font-extrabold text-white mt-2">{stats?.total_employees ?? 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Active profiles</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Present Today</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">{stats?.present_today ?? 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Checked in today</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Absent Today</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">{stats?.absent_today ?? 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Unrecorded</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">On Leave</span>
            <div className="text-3xl font-extrabold text-rose-400 mt-2">{stats?.on_leave ?? 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Approved leave today</span>
          </div>
        </div>
      )}

      {/* Subscription Usage & Capacity Widget */}
      {role === 'BUSINESS_ADMIN' && <SubscriptionUsageWidget />}
    </div>
  )
}

