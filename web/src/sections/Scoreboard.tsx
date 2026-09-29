import { AucDots } from '../charts/AucDots'
import { Journey } from '../charts/Journey'
import { LegendItem } from '../charts/Marks'
import { LoadError, Meaning, Section, Skeleton } from '../components/Section'
import { useData, type AucRow, type Scoreboard as ScoreboardData } from '../lib/data'
import { LABEL_NAME, LABELS, labelColor, type Label } from '../lib/labels'

const TIE = 0.001

function verdict(diff: number) {
  if (diff > 0) return 'Beats'
  if (Math.abs(diff) < TIE) return 'Ties'
  return 'Behind'
}

export function Scoreboard() {
  const state = useData('scoreboard')

  return (
    <Section
      id="scoreboard"
      title="Scoreboard"
      lede={
        <>
          ROC-AUC on the full Jigsaw test set of 63,978 comments. It is the chance that a random toxic comment gets a
          higher score than a random clean one: 0.5 is a coin flip and 1.0 is perfect.
        </>
      }
    >
      {state.status === 'loading' && <Skeleton label="Loading scores" height={420} />}
      {state.status === 'error' && <LoadError message={state.error} />}
      {state.status === 'ready' && <ScoreboardBody data={state.data} />}
    </Section>
  )
}

function ScoreboardBody({ data }: { data: ScoreboardData }) {
  const tfidf = data.full_test['TF-IDF + LR']
  const detox = data.full_test['Detoxify original']
  const laya = data.full_test['Laya merged (ours)']
  const rows: (Label | 'mean')[] = [...LABELS, 'mean']

  return (
    <div className="grid [&>*]:min-w-0 gap-12">
      <div className="grid [&>*]:min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="sr-only">ROC-AUC per label on the full test set</caption>
            <thead>
              <tr className="border-b border-line-strong text-left text-ink-2">
                <th scope="col" className="py-2 pr-3 font-medium">Label</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">TF-IDF + LR</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Detoxify</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-ink">Laya (ours)</th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">vs Detoxify</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row key={r} label={r} tfidf={tfidf} detox={detox} laya={laya} />
              ))}
            </tbody>
          </table>
          <Meaning>
            Laya is within 0.001 of Detoxify on the mean, beats it on obscene and insult, ties on threat, and beats
            TF-IDF on every label. Both baselines are single models, like Laya.
          </Meaning>
          <Meaning>
            For context only: the winning Kaggle entry scored 0.9886, but that was an ensemble of dozens of models, so
            it isn't a like-for-like comparison.
          </Meaning>
        </div>

        <AucDots
          series={[
            { name: 'TF-IDF + LR', shape: 'ring', color: 'var(--ink-3)', row: tfidf },
            { name: 'Detoxify', shape: 'square', color: 'var(--m-detoxify)', row: detox },
            { name: 'Laya (ours)', shape: 'dot', color: 'var(--m-laya)', row: laya },
          ]}
        />
      </div>

      <div className="grid [&>*]:min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
        <div className="max-w-[46ch]">
          <h3 className="text-lg font-semibold tracking-tight">How it got there</h3>
          <p className="mt-2 text-ink-2">
            Mean ROC-AUC on a 10,000-comment test sample at each stage. Fine-tuning helped five labels but hurt threat.
            Averaging the weights of the original and fine-tuned models (WiSE-FT) kept the gains and brought threat
            back.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
            <LegendItem shape="dot" color="var(--m-laya)">Mean of 6 labels</LegendItem>
            <LegendItem shape="dot" color={labelColor('threat')}>Threat only</LegendItem>
          </div>
        </div>
        <Journey
          sample={data.sample_10k}
          detoxify={0.9854 /* Detoxify on the same 10k sample; not in scoreboard.json */}
          tfidf={0.9769 /* TF-IDF on the same 10k sample */}
        />
      </div>
    </div>
  )
}

function Row({ label, tfidf, detox, laya }: { label: Label | 'mean'; tfidf: AucRow; detox: AucRow; laya: AucRow }) {
  const isMean = label === 'mean'
  const diff = laya[label] - detox[label]
  const v = verdict(diff)
  const good = !isMean && v !== 'Behind'
  return (
    <tr className={`border-b border-line ${isMean ? 'font-semibold' : ''} ${good ? 'bg-sunken' : ''}`}>
      <th scope="row" className="py-2 pr-3 text-left font-normal">
        <span className="inline-flex items-center gap-2">
          {!isMean && <span aria-hidden="true" className="h-2.5 w-1 rounded-full" style={{ background: labelColor(label) }} />}
          <span className={isMean ? 'font-semibold' : ''}>{isMean ? 'Mean' : LABEL_NAME[label]}</span>
        </span>
      </th>
      <td className="num px-3 py-2 text-right text-ink-2">{tfidf[label].toFixed(4)}</td>
      <td className="num px-3 py-2 text-right text-ink-2">{detox[label].toFixed(4)}</td>
      <td className="num px-3 py-2 text-right font-medium">{laya[label].toFixed(4)}</td>
      <td className="py-2 pl-3 text-right whitespace-nowrap">
        <span className="num text-ink-2">
          {diff >= 0 ? '+' : '−'}
          {Math.abs(diff).toFixed(4)}
        </span>
        {!isMean && <span className={`ml-2 text-xs ${good ? 'font-semibold text-ink' : 'text-ink-3'}`}>{v}</span>}
      </td>
    </tr>
  )
}
