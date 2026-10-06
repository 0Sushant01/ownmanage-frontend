import React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '../utils/cn'
import { X } from 'lucide-react'

export interface OwnDialogProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export const OwnDialogTrigger = DialogPrimitive.Trigger
export const OwnDialogClose = DialogPrimitive.Close

export interface OwnDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

export const OwnDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  OwnDialogContentProps
>(({ className, children, size = 'md', showCloseButton = true, ...props }, ref) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[96vw] h-[92vh]',
  }[size]

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%]',
          'bg-card text-card-foreground border border-border shadow-2xl rounded-2xl overflow-hidden',
          'duration-200 animate-in fade-in zoom-in-95',
          sizeClasses,
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
OwnDialogContent.displayName = DialogPrimitive.Content.displayName

export const OwnDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 p-6 pb-3 border-b border-border bg-card', className)}
    {...props}
  />
)
OwnDialogHeader.displayName = 'OwnDialogHeader'

export const OwnDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-6 pt-3 border-t border-border bg-card', className)}
    {...props}
  />
)
OwnDialogFooter.displayName = 'OwnDialogFooter'

export const OwnDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-bold text-foreground tracking-tight leading-none', className)}
    {...props}
  />
))
OwnDialogTitle.displayName = DialogPrimitive.Title.displayName

export const OwnDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-muted-foreground mt-1', className)}
    {...props}
  />
))
OwnDialogDescription.displayName = DialogPrimitive.Description.displayName

export const OwnDialog: React.FC<OwnDialogProps> = ({
  title,
  description,
  size = 'md',
  className,
  children,
  ...props
}) => {
  if (title) {
    return (
      <DialogPrimitive.Root {...props}>
        <OwnDialogContent size={size} className={className}>
          <OwnDialogHeader>
            <OwnDialogTitle>{title}</OwnDialogTitle>
            {description && <OwnDialogDescription>{description}</OwnDialogDescription>}
          </OwnDialogHeader>
          <div className="p-6 pt-3">{children}</div>
        </OwnDialogContent>
      </DialogPrimitive.Root>
    )
  }

  return <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>
}
