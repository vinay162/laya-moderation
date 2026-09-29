import { ArrowUpRight } from 'lucide-react'
import { m } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CountUp } from '../components/CountUp'

export const LINKS = {
  github: 'https://github.com/vinay162/laya-moderation',
  model: 'https://huggingface.co/Vinay57/laya-jigsaw-moderation',
}

// Headline numbers. Sources: scoreboard.json (mean AUC), routing_points.json at 0.10 / 0.90
// (77.79% approved + 4.07% removed), speed.json (56.6 comments/sec, two-step check).
const STATS: { value: number; format: (v: number) => string; label: string; note: string }[] = [
  { value: 0.9853, format: (v) => v.toFixed(3), label: 'mean ROC-AUC', note: 'Detoxify scores 0.986' },
  { value: 82, format: (v) => `~${Math.round(v)}%`, label: 'of decisions automated', note: 'the rest go to a person' },
  { value: 56.6, format: (v) => `${Math.floor(v)}/sec`, label: 'on one free T4 GPU', note: 'with the two-step check' },
  { value: 0, format: () => '$0', label: 'per request', note: 'self-hosted, trained on free GPUs' },
]

const ease = [0.16, 1, 0.3, 1] as const

export function Hero() {
  return (
    <header id="top" className="pt-12 pb-16 sm:pt-16 sm:pb-20">
      <m.div
        aria-hidden="true"
        className="spectrum mb-8 h-1 w-40 origin-left rounded-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease }}
      />
      <m.h1
        className="max-w-[19ch] text-[2.35rem] leading-[1.05] font-bold tracking-[-0.035em] text-balance sm:text-6xl"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.15 }}
      >
        Comment moderation that matches Detoxify and knows when it is unsure.
      </m.h1>
      <m.p
        className="mt-6 max-w-[60ch] text-lg text-ink-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.3 }}
      >
        I fine-tuned Laya, a 421M-parameter open-source decision model, on Kaggle&rsquo;s free GPUs and tested it on the
        Jigsaw toxic comment benchmark. It scores within 0.001 of Detoxify, and its confidence is calibrated well enough
        to automate most moderation decisions. Every number on this page comes from those runs.
      </m.p>

      <m.div
        className="mt-8 flex flex-wrap gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.45 }}
      >
        <Link
          to="/try"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-transform hover:-translate-y-px"
        >
          Try it live
        </Link>
        <Link to="/how" className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium hover:bg-hover">
          How it works
        </Link>
        <ExternalLink href={LINKS.github}>GitHub</ExternalLink>
        <ExternalLink href={LINKS.model}>Model on Hugging Face</ExternalLink>
      </m.div>

      <m.dl
        className="panel mt-14 grid grid-cols-2 overflow-hidden lg:grid-cols-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.55 }}
      >
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`relative flex flex-col px-4 py-5 sm:px-6 sm:py-6 ${i % 2 ? 'border-l border-line' : ''} ${
              i > 1 ? 'border-t border-line lg:border-t-0' : ''
            } ${i === 2 ? 'lg:border-l' : ''}`}
          >
            <dt className="order-2 mt-1 text-sm text-ink-2">{s.label}</dt>
            <dd className="num order-1 text-3xl font-medium tracking-tight sm:text-4xl">
              <CountUp value={s.value} format={s.format} duration={1.4} />
            </dd>
            <dd className="order-3 mt-1 text-xs text-ink-3">{s.note}</dd>
          </div>
        ))}
      </m.dl>
    </header>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full px-3 py-2.5 text-sm font-medium text-ink-2 hover:text-ink"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}
