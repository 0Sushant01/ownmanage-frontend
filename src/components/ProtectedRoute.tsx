import React from 'react'
import { Navigate, Outlet, Link } from 'react-router-dom'
import { ShieldAlert, Loader2 } from 'lucide-react'
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Authenticating session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4 text-destructive">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your account ({role}) does not have permission to view this section.
          </p>
          <Link
            to={role === 'SUPERADMIN' ? '/businesses' : '/dashboard'}
            className="inline-block bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
