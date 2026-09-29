import { ArrowUpRight } from 'lucide-react'
import { Logo } from './Controls'

export const EXTERNAL = {
  github: 'https://github.com/vinay162/laya-moderation',
  model: 'https://huggingface.co/Vinay57/laya-jigsaw-moderation',
  laya: 'https://huggingface.co/convaiinnovations/laya',
  jigsaw: 'https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge',
  hatecheck: 'https://github.com/paul-rottger/hatecheck-data',
  detoxify: 'https://github.com/unitaryai/detoxify',
  space: 'https://huggingface.co/spaces/Vinay57/laya-moderation-demo',
  linkedin: 'https://www.linkedin.com/in/vinay-purohit-58b3922b8',
}

const GROUPS = [
  {
    title: 'This project',
    links: [
      ['Source code on GitHub', EXTERNAL.github],
      ['Fine-tuned model on Hugging Face', EXTERNAL.model],
      ['Live API on Hugging Face Spaces', EXTERNAL.space],
      ['Vinay Purohit on LinkedIn', EXTERNAL.linkedin],
    ],
  },
  {
    title: 'Built on',
    links: [
      ['Laya by ConvAI Innovations', EXTERNAL.laya],
      ['Jigsaw toxic comment dataset', EXTERNAL.jigsaw],
      ['HateCheck test suite', EXTERNAL.hatecheck],
      ['Detoxify', EXTERNAL.detoxify],
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-[40ch] text-sm text-ink-2">
            Built by{' '}
            <a href={EXTERNAL.linkedin} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">
              Vinay Purohit
              <span className="sr-only"> on LinkedIn (opens in a new tab)</span>
            </a>
            . A demo only: please don&rsquo;t use it for real moderation decisions.
          </p>
          <p className="mt-3 text-xs text-ink-3">
            Code released under the Apache-2.0 licence, the same as Laya. HateCheck by R&ouml;ttger et al. (2021).
          </p>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="text-sm font-semibold">{g.title}</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {g.links.map(([label, href]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                    {label}
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
