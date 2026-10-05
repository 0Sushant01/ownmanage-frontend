import React, { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth, usePermission } from '../context/AuthContext'

export const Layout: React.FC = () => {
  const { user, role, business, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { can } = usePermission()

  // Configure navigation items based on role & permissions
  let navItems: { label: string; path: string; icon: string }[] = []

  if (role === 'SUPERADMIN') {
    navItems = [
      { label: 'Overview', path: '/dashboard', icon: '📊' },
      { label: 'Businesses', path: '/businesses', icon: '🏢' },
      { label: 'Plans & Pricing', path: '/plans', icon: '🏷️' },
      { label: 'Broker Partners', path: '/brokers', icon: '🤝' },
      { label: 'Profile', path: '/profile', icon: '👤' },
    ]
  } else if (role === 'BROKER') {
    navItems = [
      { label: 'Partner Dashboard', path: '/broker/dashboard', icon: '📈' },
      { label: 'Referred Clients', path: '/broker/referrals', icon: '🏢' },
      { label: 'Commissions', path: '/broker/commissions', icon: '💳' },
      { label: 'Profile', path: '/profile', icon: '👤' },
    ]
  } else if (role === 'BUSINESS_ADMIN') {
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: '📊' },
      { label: 'Employees', path: '/employees', icon: '👥' },
      { label: 'Managers', path: '/managers', icon: '👔' },
      { label: 'Attendance', path: '/attendance', icon: '⏱️' },
      { label: 'Attendance Policies', path: '/attendance/policies', icon: '⚙️' },
      { label: 'Leaves', path: '/leaves', icon: '🏖️' },
      { label: 'Holidays', path: '/holidays', icon: '📅' },
      { label: 'Compensation', path: '/salary', icon: '💰' },
      { label: 'Payroll Runs', path: '/payroll/runs', icon: '💳' },
      { label: 'Access Control', path: '/managers/access-control', icon: '🛡️' },
      { label: 'Settings', path: '/settings', icon: '🏢' },
      { label: 'Profile', path: '/profile', icon: '👤' },
    ]
  } else if (role === 'MANAGER') {
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: '📊' },
      { label: 'My Staff', path: '/my-staff', icon: '👥' },
      { label: 'Attendance', path: '/attendance', icon: '⏱️' },
    ]
    if (can('attendance.manage_policy')) {
      navItems.push({ label: 'Attendance Policy', path: '/attendance/policies', icon: '⚙️' })
    }
    navItems.push(
      { label: 'Leaves', path: '/leaves', icon: '🏖️' },
      { label: 'Holidays', path: '/holidays', icon: '📅' }
    )
    if (can('salary.view')) {
      navItems.push({ label: 'Salary', path: '/salary', icon: '💳' })
    }
    navItems.push({ label: 'Profile', path: '/profile', icon: '👤' })
  } else {
    // Staff
    navItems = [
      { label: 'Profile', path: '/profile', icon: '👤' },
    ]
  }

  const roleBadgeColor = {
    SUPERADMIN: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
    BROKER: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    BUSINESS_ADMIN: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    MANAGER: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    STAFF: 'bg-slate-800 text-slate-300 border-slate-700',
  }[role || 'STAFF']

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg">
              OM
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block">OwnManage</span>
              <span className="text-[11px] text-slate-400 font-mono block">
                {business?.name || (role === 'BROKER' ? 'Partner Network' : 'Platform Admin')}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center justify-between mb-3">
            <div className="truncate mr-2">
              <span className="text-xs font-semibold text-white block truncate">
                {user?.full_name || user?.email}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate block">
                {user?.email}
              </span>
            </div>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${roleBadgeColor}`}>
              {role}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 hover:border-rose-900/50 text-slate-400 text-xs py-2 rounded-lg border border-slate-700/60 transition"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Top Mobile Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">
            OM
          </div>
          <span className="font-bold text-white text-sm">OwnManage</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-300 p-2 rounded-lg bg-slate-800"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={logout}
            className="w-full text-left text-xs text-rose-400 px-3 py-2 font-medium"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
