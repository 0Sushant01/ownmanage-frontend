import React from 'react'
import { cn } from '../utils/cn'

export interface OwnFilterBarProps {
  children?: React.ReactNode
  search?: React.ReactNode
  filters?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const OwnFilterBar: React.FC<OwnFilterBarProps> = ({
  children,
  search,
  filters,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-wrap items-center justify-between gap-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {search}
        {filters || children}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

export default OwnFilterBar
