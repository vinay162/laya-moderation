import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Section } from '../components/Section'
import { Page } from '../components/Shell'
import { Hero } from '../sections/Hero'
import { Race } from '../sections/Race'
import { Stream } from '../sections/Stream'

// Published results (scoreboard.json, calibration.json, routing_points.json at 0.10 / 0.90).
const GLANCE = [
  {
    to: '/results#scoreboard',
    title: 'Accuracy',
    value: '0.9853',
    compare: 'vs 0.9863 for Detoxify',
    text: 'Mean ROC-AUC on 63,978 test comments. Beats Detoxify on obscene and insult, ties on threat.',
  },
  {
    to: '/results#calibration',
    title: 'Calibration error',
    value: '0.013',
    compare: 'down from 0.045',
    text: 'When it says 90% sure, it is right about 90% of the time on the common labels.',
  },
  {
    to: '/results#routing',
    title: 'Handled automatically',
    value: '81.86%',
    compare: 'at the 0.10 / 0.90 lines',
    text: 'The rest go to a person. Of the comments approved automatically, 0.34% were toxic. Move the lines yourself in the routing simulator.',
  },
]

export default function Overview() {
  return (
    <Page>
      <Hero />
      <Stream />
      <Race />
      <Section id="glance" title="Results at a glance" lede="The full evidence, with every table and chart, is on the Results page.">
        <ul className="grid gap-4 md:grid-cols-3">
          {GLANCE.map((g) => (
            <li key={g.to}>
              <Link
                to={g.to}
                className="panel group flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="text-sm font-medium text-ink-2">{g.title}</span>
                <span className="num mt-2 text-3xl font-medium tracking-tight">{g.value}</span>
                <span className="text-xs text-ink-3">{g.compare}</span>
                <span className="mt-3 flex-1 text-sm text-ink-2">{g.text}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  See the details
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  )
}
