import React from 'react'
import { cn } from '../utils/cn'

export interface OwnInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg' | number
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

export const OwnInput = React.forwardRef<HTMLInputElement, OwnInputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      containerClassName,
      id,
      disabled,
      size = 'md',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
    const htmlSize = typeof size === 'number' ? size : undefined
    const sizeClasses = {
      sm: 'min-h-8.5 px-3 py-1.5 text-xs',
      md: 'min-h-10 sm:min-h-11 px-3.5 py-2 text-sm',
      lg: 'min-h-12 px-4 py-2.5 text-base',
    }[typeof size === 'string' ? size : 'md']

    return (
      <div className={cn('w-full space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 pointer-events-none text-muted-foreground shrink-0">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            size={htmlSize}
            className={cn(
              'w-full rounded-xl border bg-card text-foreground placeholder:text-muted-foreground transition-all duration-150',
              sizeClasses,
              'border-border hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted',
              leftIcon ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              error ? 'border-danger focus:ring-danger' : '',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 pointer-events-none text-muted-foreground shrink-0">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-danger font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    )
  }
)
OwnInput.displayName = 'OwnInput'

export default OwnInput
