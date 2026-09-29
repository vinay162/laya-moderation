import type { ReactNode } from 'react'
import { Reliability, ReliabilityLegend, type ReliabilitySeries } from '../charts/Reliability'
import { CountUp } from '../components/CountUp'
import { Panel } from '../components/Panel'
import { LoadError, Meaning, Section, Skeleton } from '../components/Section'
import { useData, type Calibration as CalibrationData, type CalibrationRow } from '../lib/data'
import { LABEL_NAME, labelColor } from '../lib/labels'

export function Calibration() {
  const state = useData('calibration')
  return (
    <Section
      id="calibration"
      title="Calibration"
      lede="A model is well calibrated when its confidence means what it says: of all the comments it calls 90% likely toxic, about 90% really are. That matters as soon as you act on the number, for example to remove a comment automatically."
    >
      {state.status === 'loading' && <Skeleton label="Loading calibration" height={420} />}
      {state.status === 'error' && <LoadError message={state.error} />}
      {state.status === 'ready' && <CalibrationBody data={state.data} />}
    </Section>
  )
}

function CalibrationBody({ data }: { data: CalibrationData }) {
  const pooled = data.table.find((r) => r.label === 'all (pooled)')!
  const labels = data.table.filter((r) => r.label !== 'all (pooled)')
  const series: ReliabilitySeries[] = [
    { name: 'Before the fix', shape: 'ring', color: 'var(--ink-3)', dash: '5 4', bins: data.pooled_bins_before },
    { name: 'After the fix', shape: 'dot', color: 'var(--m-laya)', bins: data.pooled_bins_after },
  ]

  return (
    <div className="grid gap-6">
      <div className="grid [&>*]:min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel
          title="Said vs actually right"
          source="All six labels pooled, full test set"
          actions={<ReliabilityLegend series={series} />}
        >
          <Reliability series={series} />
          <Meaning>
            Points below the diagonal mean the model was more sure than it should have been. Before the fix, when it
            said about 97% it was right only about 60% of the time.
          </Meaning>
        </Panel>

        <div className="grid gap-6">
          <Panel bodyClassName="grid grid-cols-2 divide-x divide-line">
            <Readout label="Calibration error before" value={pooled['ECE before']} />
            <Readout label="Calibration error after" value={pooled['ECE after']} strong />
          </Panel>
          <Meaning>
            Expected calibration error (ECE) is the average gap between how sure the model said it was and how often it
            was right. Lower is better. The fix cut it about 3.5 times. ROC-AUC did not change at all, because the fix
            only rescales scores and never reorders them.
          </Meaning>

          <Panel title="Per label" source="ECE and how often a 90%+ prediction was right" bodyClassName="py-1">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Calibration per label before and after the fix</caption>
              <thead>
                <tr className="text-left text-xs text-ink-3">
                  <th scope="col" className="py-2 pr-2 pl-4 font-medium sm:pl-5">Label</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">ECE</th>
                  <th scope="col" className="py-2 pr-4 pl-2 text-right font-medium sm:pr-5">Right at 90%+</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((r) => (
                  <LabelRow key={r.label} row={r} />
                ))}
              </tbody>
            </table>
          </Panel>
          <Meaning>
            A dash means the calibrated score never reaches 90% for that label. Those labels are rare, so the model is
            rarely that sure. Calibrated scores seldom go above about 0.93.
          </Meaning>
        </div>
      </div>

      <div className="mt-4 grid [&>*]:min-w-0 gap-4 md:grid-cols-3">
        <Note title="What went wrong">
          The training data was 48% toxic, but real comments are only about 10% toxic. The model learned to expect
          toxicity far more often than it happens. This is called prior shift.
        </Note>
        <Note title="The fix">
          Per-label Platt scaling: two numbers per label, fitted on the validation set only, turn the raw score into a
          probability with <span className="num text-[13px] whitespace-nowrap">p = sigmoid(a &middot; score + b)</span>.
          Same model, same speed.
        </Note>
        <Note title="What is still off">
          The middle of the range (30% to 80%) is still somewhat overconfident on the test set. Scores below 10% and
          above 90% line up well, and those are the two ends the routing policy acts on.
        </Note>
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <span className="px-1 text-ink-3" aria-label="became">
      &rarr;
    </span>
  )
}

function LabelRow({ row }: { row: CalibrationRow }) {
  const label = row.label as Exclude<CalibrationRow['label'], 'all (pooled)'>
  const before = row['right when >=90% (before)']
  const after = row['right when >=90% (after)']
  return (
    <tr className="border-t border-line">
      <th scope="row" className="py-2 pr-2 pl-4 text-left font-normal whitespace-nowrap sm:pl-5">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-[3px] rounded-full" style={{ background: labelColor(label) }} />
          {LABEL_NAME[label]}
        </span>
      </th>
      <td className="num px-2 py-2 text-right whitespace-nowrap">
        <span className="text-ink-3">{row['ECE before'].toFixed(3)}</span>
        <Arrow />
        <span className="font-medium">{row['ECE after'].toFixed(3)}</span>
      </td>
      <td className="num py-2 pr-4 pl-2 text-right whitespace-nowrap sm:pr-5">
        {after === null ? (
          <span className="text-ink-3" title="Calibrated scores never reach 90% for this label">
            &ndash;
          </span>
        ) : (
          <>
            <span className="text-ink-3">{Math.round(before! * 100)}%</span>
            <Arrow />
            <span className="font-medium">{Math.round(after * 100)}%</span>
          </>
        )}
      </td>
    </tr>
  )
}

function Readout({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="px-4 py-5 sm:px-5">
      <div className={`num text-4xl tracking-tight ${strong ? 'font-medium text-ink' : 'text-ink-3'}`}>
        <CountUp value={value} format={(v) => v.toFixed(3)} />
      </div>
      <div className="mt-1 text-sm text-ink-2">{label}</div>
    </div>
  )
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-ink-2">{children}</p>
    </div>
  )
}
