import React from 'react'
import { cn } from '../utils/cn'
import { Loader2 } from 'lucide-react'

export interface OwnButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const OwnButton = React.forwardRef<HTMLButtonElement, OwnButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading,
      leftIcon,
      icon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isSpinnerActive = loading !== undefined ? loading : isLoading
    const effectiveLeftIcon = icon || leftIcon
    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs active:scale-[0.98]',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-muted active:scale-[0.98]',
      outline:
        'border border-border bg-card text-foreground hover:bg-muted hover:border-border-strong active:scale-[0.98]',
      ghost:
        'bg-transparent text-foreground hover:bg-muted active:scale-[0.98]',
      destructive:
        'bg-danger text-danger-foreground hover:opacity-90 shadow-xs active:scale-[0.98]',
      subtle:
        'bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.98]',
    }[variant]

    const sizes = {
      xs: 'h-7 px-2.5 text-xs rounded-lg gap-1.5',
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-9 px-4 text-sm rounded-xl gap-2',
      lg: 'h-11 px-5 text-base rounded-xl gap-2.5',
    }[size]

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinnerActive}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variants,
          sizes,
          className
        )}
        {...props}
      >
        {isSpinnerActive ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>
        )}
        <span>{children}</span>
        {!isSpinnerActive && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

OwnButton.displayName = 'OwnButton'
export default OwnButton
