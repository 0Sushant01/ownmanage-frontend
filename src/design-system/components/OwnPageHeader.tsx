import React from 'react'
import { cn } from '../utils/cn'

export interface OwnPageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  badge?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export const OwnPageHeader: React.FC<OwnPageHeaderProps> = ({
  title,
  subtitle,
  description,
  badge,
  breadcrumbs,
  actions,
  action,
  className,
}) => {
  const effectiveSubtitle = subtitle || description
  const effectiveActions = actions || action

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1',
        className
      )}
    >
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {b.href ? (
                  <a href={b.href} className="hover:text-foreground transition-colors">
                    {b.label}
                  </a>
                ) : (
                  <span className="text-foreground font-medium">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {effectiveSubtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            {effectiveSubtitle}
          </p>
        )}
      </div>

      {effectiveActions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {effectiveActions}
        </div>
      )}
    </div>
  )
}

export default OwnPageHeader
