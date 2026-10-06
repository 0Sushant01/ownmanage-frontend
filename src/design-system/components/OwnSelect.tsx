import React from 'react'
import { cn } from '../utils/cn'
import { ChevronDown } from 'lucide-react'

export interface OwnSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface OwnSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg' | number
  label?: string
  helperText?: string
  error?: string
  options?: OwnSelectOption[]
  leftIcon?: React.ReactNode
  containerClassName?: string
}

export const OwnSelect = React.forwardRef<HTMLSelectElement, OwnSelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      options,
      leftIcon,
      containerClassName,
      id,
      children,
      disabled,
      size = 'md',
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
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
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 pointer-events-none text-muted-foreground shrink-0 z-10">
              {leftIcon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            size={htmlSize}
            className={cn(
              'w-full rounded-xl border bg-card pr-10 text-foreground appearance-none transition-all duration-150 cursor-pointer',
              sizeClasses,
              'border-border hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted',
              leftIcon ? 'pl-10' : '',
              error ? 'border-danger focus:ring-danger' : '',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-card text-foreground">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3.5 pointer-events-none text-muted-foreground shrink-0">
            <ChevronDown className="w-4 h-4" />
          </div>
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
OwnSelect.displayName = 'OwnSelect'

export default OwnSelect
