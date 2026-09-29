import { useState } from 'react'
import { Panel } from '../components/Panel'
import { Redacted } from '../components/Redacted'
import { LoadError, Meaning, Section, Skeleton } from '../components/Section'
import { useData, type Errors } from '../lib/data'
import { useNearView } from '../lib/useNearView'

export function Failures() {
  const [ref, near] = useNearView<HTMLDivElement>()
  const state = useData('errors', near)
  return (
    <Section
      id="fails"
      title="Where it fails"
      lede="The model's most confident mistakes on the full test set, in both directions. They are ranked by how sure the model was, from most to least. Every one of them is blurred until you choose to read it."
    >
      <div ref={ref}>
        {state.status === 'loading' && <Skeleton label="Loading error examples" height={480} />}
        {state.status === 'error' && <LoadError message={state.error} />}
        {state.status === 'ready' && <FailuresBody data={state.data} />}
      </div>
    </Section>
  )
}

const TABS = [
  {
    key: 'false_positives',
    label: 'Flagged, but labelled clean',
    explain: 'The model was almost certain these were toxic, but the human labellers marked them clean on every label.',
  },
  {
    key: 'false_negatives',
    label: 'Missed, but labelled toxic',
    explain: 'The human labellers marked these toxic, but the model was almost certain they were fine.',
  },
] as const

function FailuresBody({ data }: { data: Errors }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('false_positives')
  const current = TABS.find((t) => t.key === tab)!
  const items = data[tab]

  return (
    <div className="grid gap-6">
      <Panel
        title={current.label}
        source={`${items.length} examples, text cut to 160 characters`}
        actions={
          <div role="tablist" aria-label="Kind of mistake" className="flex flex-wrap gap-1 rounded-full border border-line bg-sunken p-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                aria-controls="fails-list"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tab === t.key ? 'bg-panel text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {t.key === 'false_positives' ? 'False positives' : 'False negatives'}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        <p className="border-b border-line px-4 py-3 text-sm text-ink-2 sm:px-5">{current.explain}</p>
        <ol id="fails-list" role="tabpanel" className="divide-y divide-line">
          {items.map((e, i) => (
            <li key={`${tab}-${i}`} className="flex gap-4 px-4 py-3 sm:px-5">
              <span className="num w-7 shrink-0 pt-0.5 text-right text-xs text-ink-3" aria-label={`Rank ${i + 1}`}>
                #{i + 1}
              </span>
              <Redacted text={e.text} offensive className="min-w-0 flex-1 text-sm" />
            </li>
          ))}
        </ol>
      </Panel>
      <Meaning>
        Many of these are really label noise rather than model errors. One &ldquo;missed&rdquo; comment is a condolence
        message that the labellers marked toxic, and several &ldquo;false alarms&rdquo; are vandalism gibberish marked
        clean. Noise like this sets a ceiling on how high any model can score on Jigsaw.
      </Meaning>
    </div>
  )
}
