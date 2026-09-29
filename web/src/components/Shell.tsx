import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Logo, RawTextSwitch, ThemeSwitch } from './Controls'

export interface NavItem {
  id: string
  label: string
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        setActive(ids.find((id) => seen.get(id)) ?? null)
      },
      { rootMargin: '-35% 0px -55% 0px' },
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
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-bg/80 px-4 py-6 backdrop-blur lg:flex">
        <a href="#top" className="px-2">
          <Logo />
        </a>
        <RailNav nav={nav} active={active} />
        <div className="grid gap-3">
          <RawTextSwitch />
          <ThemeSwitch />
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <a href="#top">
            <Logo />
          </a>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel"
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <div id="mobile-menu" className="border-t border-line px-4 pt-3 pb-5">
            <nav aria-label="Sections">
              <ul className="grid grid-cols-2 gap-1 text-sm">
                {nav.map((n) => (
                  <li key={n.id}>
                    <a
                      href={`#${n.id}`}
                      onClick={() => setMenuOpen(false)}
                      className={`block rounded-md px-3 py-2 ${active === n.id ? 'bg-hover text-ink' : 'text-ink-2'}`}
                    >
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 grid gap-3">
              <RawTextSwitch />
              <ThemeSwitch />
            </div>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-[74rem] px-4 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  )
}

function RailNav({ nav, active }: { nav: NavItem[]; active: string | null }) {
  const list = useRef<HTMLUListElement>(null)
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    const el = active ? list.current?.querySelector<HTMLElement>(`[data-id="${active}"]`) : null
    setMarker(el ? { top: el.offsetTop, height: el.offsetHeight } : null)
  }, [active])

  return (
    <nav aria-label="Sections" className="mt-10 flex-1">
      <ul ref={list} className="relative grid gap-0.5 text-sm">
        <li
          aria-hidden="true"
          className="pointer-events-none absolute right-0 left-0 rounded-md bg-hover transition-[transform,height,opacity] duration-300 ease-out"
          style={{
            transform: `translateY(${marker?.top ?? 0}px)`,
            height: marker?.height ?? 0,
            opacity: marker ? 1 : 0,
          }}
        >
          <span className="spectrum absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full" />
        </li>
        {nav.map((n) => {
          const isActive = active === n.id
          return (
            <li key={n.id} data-id={n.id}>
              <a
                href={`#${n.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`relative block rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {n.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
