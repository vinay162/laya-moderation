import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Panel } from '../components/Panel'
import { LoadError, Meaning, Section, Skeleton } from '../components/Section'
import { useData, type Hatecheck, type HatecheckCalibrated } from '../lib/data'
import { FUNCTIONALITY } from '../lib/hatecheck'
import { useNearView } from '../lib/useNearView'

export function Bias() {
  const [ref, near] = useNearView<HTMLDivElement>()
  const hc = useData('hatecheck', near)
  const cal = useData('hatecheck_calibrated', near)
  return (
    <Section
      id="bias"
      title="Robustness and bias"
      lede="HateCheck is a set of 3,728 short test sentences written by researchers to probe specific weaknesses, like negation, counter-speech or odd spellings. Every model here answers one question: does this attack someone for their identity?"
    >
      <div ref={ref}>
        {(hc.status === 'loading' || cal.status === 'loading') && <Skeleton label="Loading HateCheck results" height={480} />}
        {hc.status === 'error' && <LoadError message={hc.error} />}
        {hc.status === 'ready' && cal.status === 'ready' && <BiasBody hc={hc.data} cal={cal.data} />}
      </div>
    </Section>
  )
}

function BiasBody({ hc, cal }: { hc: Hatecheck; cal: HatecheckCalibrated }) {
  const s = hc.summary
  const rows = [
    {
      name: 'Laya zero-shot',
      note: 'No training',
      auc: s['AUC (threshold-free)'].zero_shot,
      caught: s['hateful caught (recall)'].zero_shot,
      flagged: s['non-hateful wrongly flagged'].zero_shot,
    },
    {
      name: 'Laya merged',
      note: 'Uncalibrated, flags at 0.5',
      auc: s['AUC (threshold-free)'].merged,
      caught: s['hateful caught (recall)'].merged,
      flagged: s['non-hateful wrongly flagged'].merged,
    },
    {
      name: 'Laya merged, calibrated',
      note: 'The model this site uses',
      auc: cal.AUC,
      caught: cal['hateful caught'],
      flagged: cal['non-hateful wrongly flagged'],
      ours: true,
    },
    {
      name: 'Detoxify',
      note: 'Original model',
      auc: s['AUC (threshold-free)'].detoxify,
      caught: s['hateful caught (recall)'].detoxify,
      flagged: s['non-hateful wrongly flagged'].detoxify,
    },
  ]

  return (
    <div className="grid gap-6">
      <Panel title="Summary" source="3,728 HateCheck test cases, identity hate question" bodyClassName="relative overflow-x-auto py-1">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <caption className="sr-only">HateCheck results per model</caption>
          <thead>
            <tr className="text-left text-xs text-ink-3">
              <th scope="col" className="py-2 pr-2 pl-4 font-medium sm:pl-5">Model</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">ROC-AUC</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Hate caught</th>
              <th scope="col" className="py-2 pr-4 pl-2 text-right font-medium sm:pr-5">Harmless wrongly flagged</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={`border-t border-line ${r.ours ? 'bg-hover' : ''}`}>
                <th scope="row" className="py-2.5 pr-2 pl-4 text-left font-normal sm:pl-5">
                  <span className={r.ours ? 'font-semibold' : ''}>{r.name}</span>
                  <span className="block text-xs text-ink-3">{r.note}</span>
                </th>
                <td className="num px-2 py-2.5 text-right">{r.auc.toFixed(3)}</td>
                <td className="num px-2 py-2.5 text-right">{Math.round(r.caught * 100)}%</td>
                <td className={`num py-2.5 pr-4 pl-2 text-right sm:pr-5 ${r.ours ? 'font-semibold' : ''}`}>
                  {(r.flagged * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid [&>*]:min-w-0 gap-4 md:grid-cols-3">
        <Finding title="More robust than Detoxify">
          Every Laya version separates hateful from harmless test cases better than Detoxify (ROC-AUC 0.805 to 0.847
          against 0.694), and the calibrated model wrongly flags the fewest harmless sentences.
        </Finding>
        <Finding title="What fine-tuning helped">
          Implicit hate with no obvious bad words went from 36% to 58% caught. Reclaimed slurs used by the group itself
          went from 72% to 89% correctly left alone.
        </Finding>
        <Finding title="What fine-tuning hurt">
          Jigsaw&rsquo;s training data carries known biases, and some came along. Plain slurs went from 70% to 45%
          caught, negated hate (&ldquo;I don&rsquo;t hate them&rdquo;) from 86% to 61% correctly left alone, neutral
          identity mentions from 100% to 87%, and counter-speech got worse too.
        </Finding>
      </div>
      <Meaning>
        Calibration lowers the scores, so fewer sentences cross the 0.5 line. That is why the calibrated model catches
        less hate (46% instead of 62%) but also wrongly flags far fewer harmless ones (9.4% instead of 20.6%). ROC-AUC
        does not depend on a threshold, so it stays at 0.805.
      </Meaning>

      <Functionalities rows={hc.per_functionality} />
    </div>
  )
}

function Finding({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-ink-2">{children}</p>
    </div>
  )
}

type SortKey = 'name' | 'zero_shot' | 'merged' | 'detoxify' | 'change'
type Filter = 'all' | 'hateful' | 'non-hateful'

function Functionalities({ rows }: { rows: Hatecheck['per_functionality'] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'change', dir: 1 })
  const [filter, setFilter] = useState<Filter>('all')

  const data = useMemo(() => {
    const withNames = rows.map((r) => ({
      ...r,
      name: FUNCTIONALITY[r.index]?.name ?? r.index,
      change: r.merged - r.zero_shot,
    }))
    const filtered = filter === 'all' ? withNames : withNames.filter((r) => r.gold === filter)
    return [...filtered].sort((a, b) => {
      const va = a[sort.key]
      const vb = b[sort.key]
      return (typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * sort.dir
    })
  }, [rows, sort, filter])

  const header = (key: SortKey, label: string, cls = 'px-2 text-right') => {
    const active = sort.key === key
    const Icon = !active ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
        className={`py-2 font-medium ${cls}`}
      >
        <button
          type="button"
          onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 })}
          className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`}
        >
          {label}
          <Icon aria-hidden="true" className="h-3 w-3" />
        </button>
      </th>
    )
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`

  return (
    <Panel
      title="Every test type"
      source="Share answered correctly, uncalibrated scores at a 0.5 threshold. Click a column to sort."
      actions={
        <div role="radiogroup" aria-label="Filter test types" className="flex gap-1 rounded-full border border-line bg-sunken p-0.5">
          {(
            [
              ['all', 'All'],
              ['hateful', 'Hateful'],
              ['non-hateful', 'Not hateful'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={filter === v}
              onClick={() => setFilter(v)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === v ? 'bg-panel text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
      bodyClassName="relative overflow-x-auto py-1"
    >
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">HateCheck accuracy per test type, sortable</caption>
        <thead>
          <tr className="text-left text-xs text-ink-3">
            {header('name', 'Test type', 'pr-2 pl-4 text-left sm:pl-5')}
            {header('zero_shot', 'Zero-shot')}
            {header('merged', 'Merged')}
            {header('change', 'Change')}
            {header('detoxify', 'Detoxify', 'pr-4 pl-2 text-right sm:pr-5')}
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.index} className="border-t border-line">
              <th scope="row" className="py-2 pr-2 pl-4 text-left font-normal sm:pl-5">
                <span>{r.name}</span>
                <span className="mt-0.5 block text-xs text-ink-3">
                  {r.gold === 'hateful' ? 'Hateful' : 'Not hateful'}, {FUNCTIONALITY[r.index]?.group.toLowerCase()}
                  <code className="ml-1.5 hidden text-[11px] text-ink-3 sm:inline">{r.index}</code>
                </span>
              </th>
              <td className="num px-2 py-2 text-right text-ink-2">{pct(r.zero_shot)}</td>
              <td className="num px-2 py-2 text-right font-medium">{pct(r.merged)}</td>
              <td className="num px-2 py-2 text-right whitespace-nowrap">
                <Change v={r.change} />
              </td>
              <td className="num py-2 pr-4 pl-2 text-right text-ink-2 sm:pr-5">{pct(r.detoxify)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

function Change({ v }: { v: number }) {
  const pts = Math.round(v * 100)
  if (pts === 0) return <span className="text-ink-3">0</span>
  const up = pts > 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span className={`inline-flex items-center gap-0.5 ${up ? 'text-ok' : 'text-remove'}`}>
      <Icon aria-hidden="true" className="h-3 w-3" />
      {up ? '+' : '−'}
      {Math.abs(pts)}
      <span className="sr-only"> points after fine-tuning</span>
    </span>
  )
}
