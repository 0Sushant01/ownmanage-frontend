import React, { useId } from 'react'

interface ToggleSwitchProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  const generatedId = useId()
  const switchId = id || generatedId
  const isSm = size === 'sm'

  const handleToggle = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!disabled) {
      onChange(!checked)
    }
  }

  return (
    <div
      onClick={handleToggle}
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-semibold text-foreground">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-muted-foreground">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            handleToggle(e)
          }
        }}
        className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          isSm ? 'h-6 min-h-6 w-11' : 'h-7 min-h-7 w-13'
        } ${
          checked
            ? 'bg-primary'
            : 'bg-muted-foreground/30 hover:bg-muted-foreground/40'
        }`}
      >
        <span
          className={`pointer-events-none inline-block rounded-full bg-white dark:bg-card-foreground shadow-sm transform ring-0 transition duration-200 ease-in-out ${
            isSm ? 'h-5 w-5' : 'h-6 w-6'
          } ${
            checked
              ? isSm
                ? 'translate-x-5'
                : 'translate-x-6'
              : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default ToggleSwitch
