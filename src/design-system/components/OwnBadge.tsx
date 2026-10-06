import React from 'react'
import { cn } from '../utils/cn'

export interface OwnBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  icon?: React.ReactNode
}

export const OwnBadge = React.forwardRef<HTMLSpanElement, OwnBadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: 'bg-muted text-foreground border-border',
      primary: 'bg-primary/10 text-primary border-primary/25',
      secondary: 'bg-secondary text-secondary-foreground border-border',
      success: 'bg-success/15 text-success border-success/30 font-semibold',
      warning: 'bg-warning/15 text-warning border-warning/30 font-semibold',
      danger: 'bg-danger/15 text-danger border-danger/30 font-semibold',
      info: 'bg-info/15 text-info border-info/30 font-semibold',
      outline: 'bg-transparent text-foreground border-border',
    }[variant]

    const sizes = {
      sm: 'text-[10px] px-1.5 py-0.5 rounded-md gap-1',
      md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5',
      lg: 'text-sm px-3 py-1.5 rounded-xl gap-2',
    }[size]

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium border uppercase tracking-wider select-none shrink-0',
          variants,
          sizes,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full shrink-0', {
              'bg-foreground': variant === 'default' || variant === 'outline',
              'bg-primary': variant === 'primary',
              'bg-success': variant === 'success',
              'bg-warning': variant === 'warning',
              'bg-danger': variant === 'danger',
              'bg-info': variant === 'info',
            })}
          />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
    )
  }
)
OwnBadge.displayName = 'OwnBadge'

/**
 * Common status badge mapper for standard employment, payroll, and attendance statuses
 */
export const OwnStatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  status,
  size = 'md',
  className,
}) => {
  const norm = (status || '').toUpperCase()

  let variant: OwnBadgeProps['variant'] = 'default'
  let label = status

  switch (norm) {
    case 'ACTIVE':
    case 'PRESENT':
    case 'PAID':
    case 'APPROVED':
      variant = 'success'
      break
    case 'PROCESSED':
    case 'OVERTIME':
    case 'PROBATION':
      variant = 'info'
      break
    case 'LATE':
    case 'HALF_DAY':
    case 'PENDING':
    case 'DRAFT':
    case 'IN_PROGRESS':
      variant = 'warning'
      break
    case 'ABSENT':
    case 'REJECTED':
    case 'CANCELLED':
    case 'TERMINATED':
    case 'SUSPENDED':
      variant = 'danger'
      break
    case 'ON_LEAVE':
    case 'LEAVE_EARLY':
    case 'RESIGNED':
      variant = 'primary'
      break
    case 'HOLIDAY':
    case 'WEEKLY_OFF':
    case 'NOT_MARKED':
      variant = 'secondary'
      break
    default:
      variant = 'default'
  }

  return (
    <OwnBadge variant={variant} size={size} dot className={className}>
      {label}
    </OwnBadge>
  )
}

export default OwnBadge
