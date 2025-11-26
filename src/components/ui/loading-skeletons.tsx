/**
 * Loading Skeletons for various components
 * Provides better UX during data loading
 */

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Base skeleton with animation
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 rounded", className)} />
}

// Dashboard Stats Skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Appointment List Skeleton
export function AppointmentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Patient List Skeleton
export function PatientListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-2 text-right">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// NPHIES Claims Skeleton
export function ClaimsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-4 w-56" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="flex gap-2 justify-end">
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Message Conversation Skeleton
export function ConversationSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
          {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
          <div className={`max-w-xs lg:max-w-md ${i % 2 === 0 ? 'order-first' : ''}`}>
            <Skeleton className={`h-16 w-56 rounded-lg ${i % 2 === 0 ? 'ml-auto' : ''}`} />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
          {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
        </div>
      ))}
    </div>
  )
}

// Patient Details Skeleton
export function PatientDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-36" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Skeleton className="h-10 w-full mb-4" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Telemedicine Session Skeleton
export function TelemedicineSessionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex bg-muted/50 p-3 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex p-3 gap-4 border-t">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Full Page Loader
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-muted animate-pulse" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

// Empty State
export function EmptyState({ 
  icon: Icon,
  title,
  description,
  action
}: { 
  icon?: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon size={32} className="text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  )
}
