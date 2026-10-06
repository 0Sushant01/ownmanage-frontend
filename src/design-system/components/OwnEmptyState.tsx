import React from 'react'
import { cn } from '../utils/cn'
import { Inbox } from 'lucide-react'
import OwnButton from './OwnButton'

export interface OwnEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  action?: React.ReactNode
  className?: string
}

export const OwnEmptyState: React.FC<OwnEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-14 flex flex-col items-center justify-center text-center space-y-3',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shadow-xs">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-base font-bold text-foreground tracking-tight">{title}</h4>
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {action ? (
        <div className="pt-2">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="pt-2">
          <OwnButton variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </OwnButton>
        </div>
      ) : null}
    </div>
  )
}

export default OwnEmptyState
