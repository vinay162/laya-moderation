import type { ReactNode } from 'react'

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="pt-12 pb-4 sm:pt-16">
      <div aria-hidden="true" className="spectrum mb-6 h-1 w-24 rounded-full" />
      <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{title}</h1>
      {children && <div className="mt-4 max-w-[62ch] text-lg text-ink-2">{children}</div>}
    </header>
  )
}
