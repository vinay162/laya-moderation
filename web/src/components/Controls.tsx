import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { usePrefs } from '../lib/prefs'

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden="true" className="grid grid-cols-3 gap-[2px]">
        {['none', 'toxic', 'none', 'none', 'none', 'insult', 'obscene', 'none', 'none'].map((l, i) => (
          <span key={i} className="h-[5px] w-[5px] rounded-[1.5px]" style={{ background: `var(--l-${l})` }} />
        ))}
      </span>
      <span className="font-semibold tracking-tight">Laya moderation</span>
    </span>
  )
}

export function ThemeSwitch() {
  const { theme, setTheme } = usePrefs()
  const options = [
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'light', label: 'Light', Icon: Sun },
  ] as const
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="relative grid grid-cols-2 rounded-full border border-line bg-sunken p-0.5"
    >
      <span
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full border border-line-strong bg-panel shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.5,1)]"
        style={{ transform: theme === 'light' ? 'translateX(100%)' : 'none' }}
      />
      {options.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={`relative inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function RawTextSwitch({ compact = false }: { compact?: boolean }) {
  const { showRaw, setShowRaw } = usePrefs()
  const Icon = showRaw ? Eye : EyeOff
  if (compact) {
    return (
      <button
        type="button"
        aria-pressed={showRaw}
        onClick={() => setShowRaw(!showRaw)}
        title={showRaw ? 'Offensive text is showing. Click to blur it.' : 'Offensive text is blurred. Click to show it.'}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          showRaw ? 'border-remove/50 bg-remove/10 text-ink' : 'border-line bg-sunken text-ink-3 hover:text-ink-2'
        }`}
      >
        <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${showRaw ? 'text-remove' : ''}`} />
        {showRaw ? 'Raw text on' : 'Text blurred'}
      </button>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={showRaw}
      onClick={() => setShowRaw(!showRaw)}
      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        showRaw ? 'border-remove/50 bg-remove/10' : 'border-line bg-sunken hover:border-line-strong'
      }`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${showRaw ? 'text-remove' : 'text-ink-3'}`} />
      <span className="text-sm">
        <span className="block font-medium">{showRaw ? 'Raw text is showing' : 'Offensive text is blurred'}</span>
        <span className="block text-xs text-ink-3">{showRaw ? 'Click to blur it again' : 'Click to show everything'}</span>
      </span>
    </button>
  )
}
