import { useEffect, useState, type ReactNode } from 'react'
import { usePrefs } from '../lib/prefs'

export interface NavItem {
  id: string
  label: string
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        const first = ids.find((id) => seen.get(id))
        if (first) setActive(first)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [ids])
  return active
}

export function Shell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const active = useActiveSection(nav.map((n) => n.id))
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line px-5 py-6 lg:flex">
        <a href="#top" className="font-semibold tracking-tight">
          Laya moderation
        </a>
        <nav aria-label="Sections" className="mt-8 flex-1">
          <ul className="grid gap-0.5 text-sm">
            {nav.map((n) => (
              <li key={n.id}>
                <a
                  href={`#${n.id}`}
                  aria-current={active === n.id ? 'location' : undefined}
                  className={`block rounded px-2 py-1.5 ${
                    active === n.id ? 'bg-sunken font-medium text-ink' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Switches />
      </aside>

      {/* Mobile bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <a href="#top" className="font-semibold tracking-tight">
            Laya moderation
          </a>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded border border-line px-3 py-1.5 text-sm"
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        {menuOpen && (
          <div id="mobile-menu" className="border-t border-line px-4 pt-3 pb-5">
            <nav aria-label="Sections">
              <ul className="grid grid-cols-2 gap-1 text-sm">
                {nav.map((n) => (
                  <li key={n.id}>
                    <a href={`#${n.id}`} onClick={() => setMenuOpen(false)} className="block rounded px-2 py-2 text-ink-2">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4">
              <Switches />
            </div>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-[72rem] px-4 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  )
}

function Switches() {
  const { theme, setTheme, showRaw, setShowRaw } = usePrefs()
  return (
    <div className="grid gap-3 text-sm">
      <Toggle checked={showRaw} onChange={setShowRaw} label="Show raw text" hint="Offensive comments are blurred until you turn this on." />
      <Toggle checked={theme === 'light'} onChange={(v) => setTheme(v ? 'light' : 'dark')} label="Light theme" />
    </div>
  )
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span>
        <span className="text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-3">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full border border-line-strong bg-sunken transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus after:absolute after:top-0.5 after:left-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-ink-3 after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-panel"
      />
    </label>
  )
}
