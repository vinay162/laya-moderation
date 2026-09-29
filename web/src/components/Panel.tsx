import type { ReactNode } from 'react'

interface PanelProps {
  title?: ReactNode
  /** Where the numbers come from, e.g. "Full test set, 63,978 comments". */
  source?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** A raised instrument panel. Every chart and table on the site sits in one. */
export function Panel({ title, source, actions, children, className = '', bodyClassName = 'p-4 sm:p-5' }: PanelProps) {
  return (
    <div className={`panel min-w-0 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>}
            {source && <p className="text-xs text-ink-3">{source}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
