import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Logo, RawTextSwitch, ThemeSwitch } from './Controls'
import { Footer } from './Footer'

export interface NavItem {
  id: string
  label: string
}

export const PAGES = [
  { to: '/', label: 'Overview' },
  { to: '/results', label: 'Results' },
  { to: '/try', label: 'Try it live' },
  { to: '/how', label: 'How it was built' },
] as const

/** Site frame: page tabs across the top, and on wide screens a section menu for the current page. */
export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-6 px-4 sm:px-6">
          <NavLink to="/" aria-label="Laya moderation, overview">
            <Logo />
          </NavLink>
          <nav aria-label="Pages" className="hidden flex-1 md:block">
            <ul className="flex gap-1 text-sm">
              {PAGES.map((p) => (
                <li key={p.to}>
                  <NavLink
                    to={p.to}
                    end
                    className={({ isActive }) =>
                      `relative block rounded-full px-3 py-1.5 transition-colors ${
                        isActive ? 'bg-hover font-medium text-ink' : 'text-ink-3 hover:text-ink'
                      }`
                    }
                  >
                    {p.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <RawTextSwitch compact />
            <ThemeSwitch />
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <div id="mobile-menu" className="border-t border-line px-4 pt-3 pb-5 md:hidden">
            <nav aria-label="Pages">
              <ul className="grid gap-1 text-sm">
                {PAGES.map((p) => (
                  <li key={p.to}>
                    <NavLink
                      to={p.to}
                      end
                      className={({ isActive }) =>
                        `block rounded-md px-3 py-2 ${isActive ? 'bg-hover font-medium text-ink' : 'text-ink-2'}`
                      }
                    >
                      {p.label}
                    </NavLink>
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

      <div id="main">{children}</div>
      <Footer />
    </div>
  )
}

/** A page body, optionally with a sticky section menu on the left for wide screens. */
export function Page({ sections, children }: { sections?: NavItem[]; children: ReactNode }) {
  if (!sections?.length) {
    return <main className="mx-auto w-full max-w-[74rem] px-4 sm:px-8 lg:px-12">{children}</main>
  }
  return (
    <div className="mx-auto max-w-[90rem] xl:grid xl:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] px-4 pt-16 xl:block">
        <SectionNav sections={sections} />
      </aside>
      <main className="mx-auto w-full max-w-[74rem] min-w-0 px-4 sm:px-8 lg:px-12">{children}</main>
    </div>
  )
}

function useActiveSection(key: string) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const ids = key.split(',')
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
  }, [key])
  return active
}

function SectionNav({ sections }: { sections: NavItem[] }) {
  const active = useActiveSection(sections.map((s) => s.id).join(','))
  const list = useRef<HTMLUListElement>(null)
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    const el = active ? list.current?.querySelector<HTMLElement>(`[data-id="${active}"]`) : null
    setMarker(el ? { top: el.offsetTop, height: el.offsetHeight } : null)
  }, [active])

  return (
    <nav aria-label="On this page">
      <p className="mb-2 px-3 text-xs text-ink-3">On this page</p>
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
        {sections.map((s) => {
          const isActive = active === s.id
          return (
            <li key={s.id} data-id={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`relative block rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {s.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Scrolls to the top on page change, or to the #section in the URL once it has rendered. */
export function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    // Sections above the target load their data lazily and grow, which pushes the target down.
    // Keep it aligned for a short while, and stop as soon as the visitor scrolls on their own.
    const id = decodeURIComponent(hash.slice(1))
    let ticks = 0
    let stop = false
    const cancel = () => (stop = true)
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })
    window.addEventListener('keydown', cancel)
    const timer = setInterval(() => {
      const el = document.getElementById(id)
      if (el && !stop && Math.abs(el.getBoundingClientRect().top - 72) > 4) el.scrollIntoView()
      if (stop || ++ticks > 50) clearInterval(timer)
    }, 60)
    return () => {
      clearInterval(timer)
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
      window.removeEventListener('keydown', cancel)
    }
  }, [pathname, hash])
  return null
}
