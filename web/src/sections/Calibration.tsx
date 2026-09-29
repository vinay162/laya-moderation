import { Reliability } from '../charts/Reliability'
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

  return (
    <div className="grid [&>*]:min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <Reliability
          series={[
            {
              name: 'Before the fix',
              shape: 'ring',
              color: 'var(--ink-3)',
              dash: '5 4',
              bins: data.pooled_bins_before,
            },
            { name: 'After per-label Platt scaling', shape: 'dot', color: 'var(--m-laya)', bins: data.pooled_bins_after },
          ]}
        />
        <Meaning>
          All six labels pooled, full test set. Points below the diagonal mean the model was more confident than it
          should have been. Before the fix, when it said about 97% it was right only about 60% of the time.
        </Meaning>
      </div>

      <div className="grid [&>*]:min-w-0 content-start gap-8">
        <div className="grid grid-cols-2 gap-6">
          <Stat label="Calibration error before" value={pooled['ECE before'].toFixed(3)} />
          <Stat label="Calibration error after" value={pooled['ECE after'].toFixed(3)} strong />
        </div>
        <Meaning>
          Expected calibration error (ECE) is the average gap between how sure the model said it was and how often it
          was right. Lower is better. The fix cut it about 3.5 times, and ROC-AUC did not change at all, because the
          fix only rescales scores and never reorders them.
        </Meaning>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <caption className="sr-only">Calibration per label before and after the fix</caption>
            <thead>
              <tr className="border-b border-line-strong text-left text-ink-2">
                <th scope="col" className="py-2 pr-3 font-medium">Label</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">ECE before</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">ECE after</th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">Right when 90%+ sure</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((r) => (
                <LabelRow key={r.label} row={r} />
              ))}
            </tbody>
          </table>
          <Meaning>
            A dash means the calibrated score never reaches 90% for that label. Those labels are rare, so the model is
            rarely that sure. Calibrated scores seldom go above about 0.93.
          </Meaning>
        </div>
      </div>

      <div className="grid [&>*]:min-w-0 gap-6 lg:col-span-2 lg:grid-cols-3">
        <Explainer title="What went wrong">
          The training data was 48% toxic, but real comments are only about 10% toxic. The model learned to expect
          toxicity far more often than it happens. This is called prior shift.
        </Explainer>
        <Explainer title="The fix">
          Per-label Platt scaling: two numbers per label, fitted on the validation set only, turn the raw score into a
          probability with p = sigmoid(a &times; score + b). Same model, same speed.
        </Explainer>
        <Explainer title="What is still off">
          The middle of the range (30% to 80%) is still somewhat overconfident on the test set. Scores below 10% and
          above 90% line up well, and those are the two ends the routing policy below acts on.
        </Explainer>
      </div>
    </div>
  )
}

function LabelRow({ row }: { row: CalibrationRow }) {
  const label = row.label as Exclude<CalibrationRow['label'], 'all (pooled)'>
  const before = row['right when >=90% (before)']
  const after = row['right when >=90% (after)']
  return (
    <tr className="border-b border-line">
      <th scope="row" className="py-2 pr-3 text-left font-normal">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-1 rounded-full" style={{ background: labelColor(label) }} />
          {LABEL_NAME[label]}
        </span>
      </th>
      <td className="num px-3 py-2 text-right text-ink-2">{row['ECE before'].toFixed(3)}</td>
      <td className="num px-3 py-2 text-right font-medium">{row['ECE after'].toFixed(3)}</td>
      <td className="num py-2 pl-3 text-right whitespace-nowrap">
        {after === null ? (
          <span className="text-ink-3" title="Calibrated scores never reach 90% for this label">
            &ndash;
          </span>
        ) : (
          <>
            <span className="text-ink-3">{Math.round(before! * 100)}%</span>
            <span className="px-1.5 text-ink-3" aria-label="became">&rsaquo;</span>
            <span className="font-medium">{Math.round(after * 100)}%</span>
          </>
        )}
      </td>
    </tr>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className={`num text-3xl ${strong ? 'font-medium text-ink' : 'text-ink-3'}`}>{value}</div>
      <div className="mt-1 text-sm text-ink-2">{label}</div>
    </div>
  )
}

function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-line-strong pl-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-ink-2">{children}</p>
    </div>
  )
}
