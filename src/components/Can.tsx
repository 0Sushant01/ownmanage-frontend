import React from 'react'
import { Lock } from 'lucide-react'
import { usePermission } from '../context/AuthContext'

interface CanProps {
  permission: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Conditionally renders children if the authenticated user has the specified permission.
 * For SuperAdmin and Business Admin, always returns true.
 */
export const Can: React.FC<CanProps> = ({ permission, fallback = null, children }) => {
  const { can } = usePermission()
  if (can(permission)) {
    return <>{children}</>
  }
  return <>{fallback}</>
}

interface PermissionGuardProps {
  permission: string
  title?: string
  message?: string
  children: React.ReactNode
}

/**
 * Screen-level guard that displays a professional unauthorized placeholder
 * when permission is missing.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  title = 'Access Restricted',
  message = 'You do not have permission to view or manage this module. Please contact your Enterprise Administrator.',
  children,
}) => {
  const { can } = usePermission()

  if (can(permission)) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-2xl border border-border my-8 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center mb-4 text-warning">
        <Lock className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-6">{message}</p>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-mono border border-border">
        <span className="text-muted-foreground">Required:</span>
        <span className="text-warning font-semibold">{permission}</span>
      </div>
    </div>
  )
}
