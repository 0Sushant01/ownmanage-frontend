import React from 'react'
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
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 my-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 text-amber-400">
        🔒
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-md mb-6">{message}</p>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
        <span>Required:</span>
        <span className="text-amber-400">{permission}</span>
      </div>
    </div>
  )
}
