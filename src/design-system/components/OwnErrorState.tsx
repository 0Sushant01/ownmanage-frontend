import React from 'react'
import { cn } from '../utils/cn'
import { AlertCircle, RotateCcw } from 'lucide-react'
import OwnButton from './OwnButton'

export interface OwnErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
  banner?: boolean
}

export const OwnErrorState: React.FC<OwnErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
  banner = false,
}) => {
  if (banner) {
    return (
      <div
        className={cn(
          'p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-between gap-3 text-sm',
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
          <span className="font-medium text-xs sm:text-sm">{message}</span>
        </div>
        {onRetry && (
          <OwnButton variant="outline" size="xs" onClick={onRetry} leftIcon={<RotateCcw className="w-3 h-3" />}>
            Retry
          </OwnButton>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-danger/20 bg-danger/5 p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-3',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-base font-bold text-foreground tracking-tight">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <OwnButton variant="outline" size="sm" onClick={onRetry} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Try Again
          </OwnButton>
        </div>
      )}
    </div>
  )
}

export default OwnErrorState
