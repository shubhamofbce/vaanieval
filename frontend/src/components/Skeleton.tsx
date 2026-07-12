// Polished loading placeholder used instead of plain "Loading..." text so
// route transitions and data fetches don't feel unfinished on a demo.
type SkeletonProps = {
  lines?: number
  className?: string
}

export function Skeleton({ lines = 3, className = '' }: SkeletonProps) {
  return (
    <div className={`skeleton-block ${className}`.trim()} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, index) => (
        <span
          key={index}
          className="skeleton-line"
          style={{ width: index === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="panel skeleton-page">
      <span className="skeleton-line skeleton-line-title" />
      <Skeleton lines={4} />
    </div>
  )
}
