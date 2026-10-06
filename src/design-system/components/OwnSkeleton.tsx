import React from 'react'
import { cn } from '../utils/cn'

export function OwnSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-muted/80', className)}
      {...props}
    />
  )
}

export function OwnKpiSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <OwnSkeleton className="h-3 w-20" />
            <OwnSkeleton className="h-8 w-8 rounded-xl" />
          </div>
          <OwnSkeleton className="h-8 w-28 rounded-lg" />
          <OwnSkeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  )
}

export function OwnTableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <OwnSkeleton className="h-4 w-32" />
        <OwnSkeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2">
            {Array.from({ length: cols }).map((_, j) => (
              <OwnSkeleton key={j} className="h-4 flex-1 rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OwnSkeleton
