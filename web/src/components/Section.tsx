import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  title: string
  /** One or two plain sentences under the title. */
  lede?: ReactNode
  badge?: ReactNode
  children: ReactNode
}

export function Section({ id, title, lede, badge, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line py-14 sm:py-20">
      <header className="mb-8 max-w-[68ch]">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            {title}
          </h2>
          {badge}
        </div>
        {lede && <p className="mt-3 text-ink-2">{lede}</p>}
      </header>
      {children}
    </section>
  )
}

/** The short "what this means" note that sits next to a metric. */
export function Meaning({ children }: { children: ReactNode }) {
  return <p className="mt-2 max-w-[62ch] text-sm text-ink-3">{children}</p>
}

export function Skeleton({ height = 240, label }: { height?: number; label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="animate-pulse rounded-md bg-sunken"
      style={{ height }}
    />
  )
}

export function LoadError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md border border-line bg-sunken p-4 text-sm text-ink-2">
      {message}. Reload the page to try again.
    </p>
  )
}
