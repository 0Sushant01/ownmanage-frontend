import React, { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LogOut,
  Menu,
  X,
  Layers,
  Building2,
  Tag,
  Handshake,
  User,
  TrendingUp,
  Users,
  Clock,
  Settings,
  CalendarDays,
  DollarSign,
  Shield,
  ChevronDown,
  Palette,
  Wallet,
} from 'lucide-react'
import { useAuth, usePermission } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'

const navIcon = 'w-4 h-4 shrink-0'

interface NavChild {
  label: string
  path: string
}

interface NavItem {
  label: string
  path: string
  icon: ReactNode
  children?: NavChild[]
}

export const Layout: React.FC = () => {
  const { user, role, business, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { can } = usePermission()

  let navItems: NavItem[] = []

  if (role === 'SUPERADMIN') {
    navItems = [
      { label: 'Overview', path: '/dashboard', icon: <Layers className={navIcon} /> },
      { label: 'Businesses', path: '/businesses', icon: <Building2 className={navIcon} /> },
      { label: 'Plans & Pricing', path: '/plans', icon: <Tag className={navIcon} /> },
      { label: 'Broker Partners', path: '/brokers', icon: <Handshake className={navIcon} /> },
      { label: 'Theme Audit', path: '/theme-audit', icon: <Palette className={navIcon} /> },
      { label: 'Profile', path: '/profile', icon: <User className={navIcon} /> },
    ]
  } else if (role === 'BROKER') {
    navItems = [
      { label: 'Partner Dashboard', path: '/broker/dashboard', icon: <TrendingUp className={navIcon} /> },
      { label: 'Referred Clients', path: '/broker/referrals', icon: <Building2 className={navIcon} /> },
      { label: 'Commissions', path: '/broker/commissions', icon: <DollarSign className={navIcon} /> },
      { label: 'Profile', path: '/profile', icon: <User className={navIcon} /> },
    ]
  } else if (role === 'BUSINESS_ADMIN') {
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: <Layers className={navIcon} /> },
      { label: 'Employees', path: '/employees', icon: <Users className={navIcon} /> },
      {
        label: 'Team & Access',
        path: '/managers',
        icon: <Shield className={navIcon} />,
        children: [
          { label: 'Managers', path: '/managers' },
          { label: 'Roles & Permissions', path: '/managers/access-control' },
          { label: 'Centre Access', path: '/managers?tab=centres' },
        ],
      },
      {
        label: 'Attendance',
        path: '/attendance',
        icon: <Clock className={navIcon} />,
        children: [
          { label: 'Daily Register', path: '/attendance' },
          { label: 'Monthly Grid', path: '/attendance?tab=monthly' },
          { label: 'Attendance Policy', path: '/attendance?tab=policy' },
          { label: 'Leaves', path: '/leaves' },
        ],
      },
      {
        label: 'Calendar',
        path: '/meetings',
        icon: <CalendarDays className={navIcon} />,
        children: [
          { label: 'Meetings', path: '/meetings' },
          { label: 'Holidays', path: '/holidays' },
        ],
      },
      {
        label: 'Payroll & Compensation',
        path: '/compensation',
        icon: <Wallet className={navIcon} />,
        children: [
          { label: 'Compensation', path: '/compensation' },
          { label: 'Payroll Runs', path: '/payroll/runs' },
          { label: 'Payslips & Register', path: '/salary' },
        ],
      },
      { label: 'Settings', path: '/settings', icon: <Settings className={navIcon} /> },
      { label: 'Profile', path: '/profile', icon: <User className={navIcon} /> },
    ]
  } else if (role === 'MANAGER') {
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: <Layers className={navIcon} /> },
      { label: 'My Staff', path: '/my-staff', icon: <Users className={navIcon} /> },
      {
        label: 'Attendance',
        path: '/attendance',
        icon: <Clock className={navIcon} />,
        children: [
          { label: 'Daily Register', path: '/attendance' },
          { label: 'Monthly Grid', path: '/attendance?tab=monthly' },
          ...(can('attendance.manage_policy')
            ? [{ label: 'Attendance Policy', path: '/attendance?tab=policy' }]
            : []),
          { label: 'Leaves', path: '/leaves' },
        ],
      },
      {
        label: 'Calendar',
        path: '/meetings',
        icon: <CalendarDays className={navIcon} />,
        children: [
          { label: 'Meetings', path: '/meetings' },
          { label: 'Holidays', path: '/holidays' },
        ],
      },
    ]
    if (can('salary.view')) {
      navItems.push({
        label: 'Payroll & Compensation',
        path: '/salary',
        icon: <Wallet className={navIcon} />,
        children: [
          { label: 'Payslips & Register', path: '/salary' },
        ],
      })
    }
    navItems.push({ label: 'Profile', path: '/profile', icon: <User className={navIcon} /> })
  } else {
    navItems = [
      { label: 'Profile', path: '/profile', icon: <User className={navIcon} /> },
    ]
  }

  const currentPath = location.pathname.replace(/\/+$/, '') || '/'

  const isSubItemActive = (targetPath: string) => {
    const [pathPart, queryPart] = targetPath.split('?')
    const cleanTarget = pathPart.replace(/\/+$/, '') || '/'

    if (queryPart) {
      return currentPath === cleanTarget && location.search.includes(queryPart)
    }

    if (targetPath === '/attendance') {
      return currentPath === '/attendance' && (!location.search || location.search.includes('tab=register'))
    }

    if (targetPath === '/managers') {
      return (
        currentPath === '/managers' &&
        (!location.search || !location.search.includes('tab=centres'))
      )
    }

    if (targetPath === '/managers/access-control') {
      return currentPath.includes('/access-control')
    }

    return currentPath === cleanTarget || currentPath.startsWith(cleanTarget + '/')
  }

  const isItemActive = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      return item.children.some((c) => isSubItemActive(c.path)) || location.pathname.startsWith(item.path)
    }

    const cleanItemPath = item.path.replace(/\/+$/, '') || '/'
    if (currentPath === cleanItemPath) return true

    const hasMoreSpecificMatch = navItems.some((other) => {
      const otherClean = other.path.replace(/\/+$/, '') || '/'
      return (
        otherClean !== cleanItemPath &&
        otherClean.startsWith(cleanItemPath + '/') &&
        (currentPath === otherClean || currentPath.startsWith(otherClean + '/'))
      )
    })
    if (hasMoreSpecificMatch) return false

    return cleanItemPath !== '/dashboard' && currentPath.startsWith(cleanItemPath + '/')
  }

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileMenuOpen])

  // Collapsible menu state (expanded/minimized)
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>({})

  // Auto-expand menu when navigating or landing on an active child route
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && isItemActive(item)) {
        setCollapsedMenus((prev) => {
          if (prev[item.label]) {
            const next = { ...prev }
            delete next[item.label]
            return next
          }
          return prev
        })
      }
    })
  }, [location.pathname, location.search])

  const toggleMenu = (label: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setCollapsedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }))
  }

  const navLinkClass = (isActive: boolean) =>
    `flex items-center space-x-2.5 min-h-9 px-3 py-2 rounded-lg text-xs font-medium tracking-tight transition-all duration-150 select-none ${
      isActive
        ? 'bg-sidebar-active text-sidebar-active-foreground font-semibold border border-primary/20 shadow-2xs'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
    }`

  return (
    <div className="min-h-screen min-h-dvh bg-background text-foreground flex flex-col md:flex-row transition-colors font-sans antialiased">
      <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-colors shadow-2xs shrink-0">
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-xs shadow-2xs shrink-0 tracking-tight">
              OM
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-foreground text-sm tracking-tight block truncate">
                OwnManage
              </span>
              <span className="text-[11px] text-muted-foreground font-mono block truncate">
                {business?.name || (role === 'BROKER' ? 'Partner Network' : 'Platform Admin')}
              </span>
            </div>
          </div>
          <ThemeToggle size="sm" />
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = isItemActive(item)
            const isCollapsed = !!collapsedMenus[item.label]
            return (
              <div key={item.label} className="space-y-0.5">
                <div className="flex items-center">
                  <Link to={item.path} className={`flex-1 ${navLinkClass(isActive)}`}>
                    <span className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate flex-1">{item.label}</span>
                  </Link>
                  {item.children && (
                    <button
                      type="button"
                      onClick={(e) => toggleMenu(item.label, e)}
                      className="p-1.5 ml-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
                      title={isCollapsed ? `Expand ${item.label}` : `Minimize ${item.label}`}
                      aria-label={isCollapsed ? `Expand ${item.label}` : `Minimize ${item.label}`}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        } ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground/70'}`}
                      />
                    </button>
                  )}
                </div>
                {item.children && !isCollapsed && (
                  <div className="ml-4 pl-2.5 border-l border-sidebar-border my-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      const isChildActive = isSubItemActive(child.path)
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`block px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                            isChildActive
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border bg-muted/30">
          <div className="flex items-center justify-between mb-2.5">
            <div className="truncate mr-2">
              <span className="text-xs font-semibold text-foreground block truncate">
                {user?.full_name || user?.email}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono truncate block">
                {user?.email}
              </span>
            </div>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border border-border bg-card text-muted-foreground shrink-0">
              {role}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full min-h-8 flex items-center justify-center space-x-1.5 bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground text-xs py-1.5 rounded-lg border border-border transition-colors shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div
        className="md:hidden flex items-center justify-between px-4 bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40 transition-colors shadow-2xs"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-xs shadow-2xs shrink-0">
            OM
          </div>
          <span className="font-semibold text-foreground text-sm tracking-tight truncate">OwnManage</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle size="sm" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 border border-border transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-xs"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="absolute top-0 right-0 h-full w-[min(19rem,86vw)] bg-sidebar text-sidebar-foreground border-l border-sidebar-border shadow-xl flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <span className="text-sm font-semibold text-foreground tracking-tight">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
              {navItems.map((item) => {
                const isActive = isItemActive(item)
                const isCollapsed = !!collapsedMenus[item.label]
                return (
                  <div key={item.label} className="space-y-0.5">
                    <div className="flex items-center">
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex-1 ${navLinkClass(isActive)}`}
                      >
                        <span className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                          {item.icon}
                        </span>
                        <span className="truncate flex-1">{item.label}</span>
                      </Link>
                      {item.children && (
                        <button
                          type="button"
                          onClick={(e) => toggleMenu(item.label, e)}
                          className="p-1.5 ml-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
                          title={isCollapsed ? `Expand ${item.label}` : `Minimize ${item.label}`}
                          aria-label={isCollapsed ? `Expand ${item.label}` : `Minimize ${item.label}`}
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isCollapsed ? '-rotate-90' : 'rotate-0'
                            } ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground/70'}`}
                          />
                        </button>
                      )}
                    </div>
                    {item.children && !isCollapsed && (
                      <div className="ml-4 pl-2.5 border-l border-sidebar-border my-0.5 space-y-0.5">
                        {item.children.map((child) => {
                          const isChildActive = isSubItemActive(child.path)
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                                isChildActive
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              }`}
                            >
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
            <div className="p-3 border-t border-sidebar-border bg-muted/30">
              <button
                onClick={logout}
                className="w-full min-h-9 flex items-center justify-center space-x-1.5 bg-card text-muted-foreground hover:text-destructive rounded-lg border border-border text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
