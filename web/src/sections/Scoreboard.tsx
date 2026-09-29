import { AucDots } from '../charts/AucDots'
import { Journey } from '../charts/Journey'
import { LegendItem, LegendLine } from '../charts/Marks'
import { ScoreTable, type ModelSeries } from '../charts/ScoreTable'
import { Panel } from '../components/Panel'
import { LoadError, Meaning, Section, Skeleton } from '../components/Section'
import { useData, type Scoreboard as ScoreboardData } from '../lib/data'
import { labelColor } from '../lib/labels'

// Detoxify and TF-IDF on the same 10k sample (published results; not stored in scoreboard.json).
const SAMPLE_DETOXIFY = 0.9854
const SAMPLE_TFIDF = 0.9769

export function Scoreboard() {
  const state = useData('scoreboard')
  return (
    <Section
      id="scoreboard"
      title="Scoreboard"
      lede="ROC-AUC is the chance that a random toxic comment gets a higher score than a random clean one. 0.5 is a coin flip, 1.0 is perfect."
    >
      {state.status === 'loading' && <Skeleton label="Loading scores" height={420} />}
      {state.status === 'error' && <LoadError message={state.error} />}
      {state.status === 'ready' && <ScoreboardBody data={state.data} />}
    </Section>
  )
}

function ScoreboardBody({ data }: { data: ScoreboardData }) {
  const tfidf: ModelSeries = {
    name: 'TF-IDF + LR',
    short: 'TF-IDF',
    shape: 'ring',
    color: 'var(--ink-3)',
    row: data.full_test['TF-IDF + LR'],
  }
  const detox: ModelSeries = {
    name: 'Detoxify',
    short: 'Detoxify',
    shape: 'square',
    color: 'var(--m-detoxify)',
    row: data.full_test['Detoxify original'],
  }
  const laya: ModelSeries = {
    name: 'Laya (ours)',
    short: 'Laya',
    shape: 'dot',
    color: 'var(--m-laya)',
    row: data.full_test['Laya merged (ours)'],
  }
  const legend = [tfidf, detox, laya].map((s) => (
    <LegendItem key={s.name} shape={s.shape} color={s.color}>
      {s.name}
    </LegendItem>
  ))

  return (
    <div className="grid gap-6">
      <Panel title="ROC-AUC per label" source="Full Jigsaw test set, 63,978 comments" actions={legend} bodyClassName="py-2">
        <ScoreTable tfidf={tfidf} detox={detox} laya={laya} />
      </Panel>

      <Panel title="Same scores as a chart" source="Scale runs from 0.96 to 1.00" actions={legend} className="md:hidden">
        <AucDots series={[tfidf, detox, laya]} legend={false} />
      </Panel>

      <div className="grid [&>*]:min-w-0 gap-x-10 gap-y-2 md:grid-cols-2">
        <Meaning>
          Laya is within 0.001 of Detoxify on the mean, beats it on obscene and insult, ties on threat, and beats TF-IDF
          on every label. Both baselines are single models, like Laya.
        </Meaning>
        <Meaning>
          For context only: the winning Kaggle entry scored 0.9886, but it was an ensemble of dozens of models, so it
          is not a like-for-like comparison.
        </Meaning>
      </div>

      <div className="mt-8 grid [&>*]:min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-10">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">How it got there</h3>
          <p className="mt-2 text-ink-2">
            Fine-tuning helped five labels but hurt threat. Averaging the weights of the original and fine-tuned models
            (a technique called WiSE-FT) kept the gains and brought threat back, at no extra cost per comment.
          </p>
        </div>
        <Panel
          title="Mean ROC-AUC by stage"
          source="10,000-comment test sample"
          actions={
            <>
              <LegendLine color="var(--m-laya)">Mean of 6 labels</LegendLine>
              <LegendLine color={labelColor('threat')} dash="5 4">
                Threat only
              </LegendLine>
            </>
          }
        >
          <Journey sample={data.sample_10k} detoxify={SAMPLE_DETOXIFY} tfidf={SAMPLE_TFIDF} />
        </Panel>
      </div>
    </div>
  )
}
