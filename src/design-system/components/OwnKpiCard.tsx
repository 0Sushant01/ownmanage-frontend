import React from 'react'
import { cn } from '../utils/cn'

export interface OwnKpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: string
  icon?: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  trend?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  loading?: boolean
  className?: string
  onClick?: () => void
}

export const OwnKpiCard: React.FC<OwnKpiCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = 'default',
  trend,
  loading = false,
  className,
  onClick,
}) => {
  const effectiveSubtitle = subtitle || change
  const variantStyles = {
    default: {
      card: 'border-border hover:border-border-strong',
      iconContainer: 'bg-muted text-muted-foreground',
      valueColor: 'text-foreground',
    },
    primary: {
      card: 'border-primary/20 hover:border-primary/40',
      iconContainer: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    success: {
      card: 'border-success/20 hover:border-success/40',
      iconContainer: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    warning: {
      card: 'border-warning/20 hover:border-warning/40',
      iconContainer: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    danger: {
      card: 'border-danger/20 hover:border-danger/40',
      iconContainer: 'bg-danger/10 text-danger',
      valueColor: 'text-danger',
    },
    info: {
      card: 'border-info/20 hover:border-info/40',
      iconContainer: 'bg-info/10 text-info',
      valueColor: 'text-info',
    },
  }[variant]

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 flex flex-col justify-between space-y-2',
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : '',
        variantStyles.card,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {title}
        </span>
        {icon && (
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200',
              variantStyles.iconContainer
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded-lg" />
        ) : (
          <div className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight font-sans', variantStyles.valueColor)}>
            {value}
          </div>
        )}

        {(effectiveSubtitle || trend) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {trend && (
              <span
                className={cn(
                  'font-semibold inline-flex items-center gap-0.5',
                  trend.isPositive ? 'text-success' : 'text-danger'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {trend?.label && <span>{trend.label}</span>}
            {effectiveSubtitle && !trend && <span>{effectiveSubtitle}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnKpiCard
