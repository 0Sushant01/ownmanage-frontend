import React from 'react'
import { cn } from '../utils/cn'

export interface OwnCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
}

export const OwnCard = React.forwardRef<HTMLDivElement, OwnCardProps>(
  ({ className, elevated = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground transition-all duration-200',
        elevated ? 'shadow-md border-border-strong' : 'shadow-xs',
        className
      )}
      {...props}
    />
  )
)
OwnCard.displayName = 'OwnCard'

export const OwnCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pb-2 sm:pb-3 flex flex-col space-y-1.5', className)} {...props} />
  )
)
OwnCardHeader.displayName = 'OwnCardHeader'

export const OwnCardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-bold text-foreground tracking-tight leading-none', className)}
      {...props}
    />
  )
)
OwnCardTitle.displayName = 'OwnCardTitle'

export const OwnCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs text-muted-foreground mt-1', className)} {...props} />
  )
)
OwnCardDescription.displayName = 'OwnCardDescription'

export const OwnCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pt-3', className)} {...props} />
  )
)
OwnCardContent.displayName = 'OwnCardContent'

export const OwnCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5 sm:p-6 pt-0 border-t border-border mt-4 flex items-center justify-between', className)}
      {...props}
    />
  )
)
OwnCardFooter.displayName = 'OwnCardFooter'
