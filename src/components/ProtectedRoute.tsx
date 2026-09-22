import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Authenticating session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/50 rounded-2xl p-8">
          <span className="text-4xl mb-4 block">🚫</span>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your account ({role}) does not have permission to view this section.
          </p>
          <a
            href={role === 'SUPERADMIN' ? '/businesses' : '/dashboard'}
            className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg border border-slate-700 transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
