import { FileCode2 } from 'lucide-react'
import { m, useScroll, useSpring } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { MixCurve } from '../charts/MixCurve'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { Redacted } from '../components/Redacted'
import { Meaning, Section } from '../components/Section'
import { Page, type NavItem } from '../components/Shell'
import { useData } from '../lib/data'
import { LINKS } from '../sections/Hero'

const SECTIONS: NavItem[] = [
  { id: 'story', label: 'The six steps' },
  { id: 'speed', label: 'Speed' },
  { id: 'limits', label: 'Limitations' },
  { id: 'notebooks', label: 'Notebooks' },
]

export default function How() {
  return (
    <Page sections={SECTIONS}>
      <PageHeader title="How it was built">
        Six steps, from reproducing the baselines to a calibrated model you can route decisions with. All the training
        ran on Kaggle&rsquo;s free GPUs, and every step is a notebook you can open.
      </PageHeader>
      <Story />
      <Speed />
      <Limits />
      <Notebooks />
    </Page>
  )
}

/* ---------- Timeline ---------- */

interface Step {
  title: string
  value: ReactNode
  valueNote: string
  body: ReactNode
  lesson: string
  extra?: ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Reproduce the baselines',
    value: '0.9863',
    valueNote: 'Detoxify on the full test set, against a published 0.9864',
    body: (
      <>
        Before touching Laya, I scored two baselines on the official test set: a classic TF-IDF keyword model with
        logistic regression (0.9786) and Detoxify (0.9863). Detoxify&rsquo;s published score is 0.9864, so the
        evaluation code was doing the right thing.
      </>
    ),
    lesson: 'Reproduce a known number before you trust your own.',
  },
  {
    title: 'Fine-tune Laya for free',
    value: '2h 12m',
    valueNote: 'on Kaggle’s free 2×T4 GPUs',
    body: (
      <>
        I fine-tuned Laya on 12,000 comments, balanced between toxic and clean. Each comment was asked all six
        questions, which gives 72,000 training examples, and training ran for 2 epochs. Five labels improved clearly.
        Threat got worse: 0.995 down to 0.950 on a 10,000-comment sample.
      </>
    ),
    lesson: 'An average can hide one label going backwards.',
  },
  {
    title: 'Find out why threat dropped',
    value: '2 of 34',
    valueNote: 'threat comments in the sample that moved the score',
    body: (
      <>
        My first guess was that rounding the probabilities was blurring the ranking. I re-scored without rounding and
        the drop stayed, so that idea was wrong. The real cause was two mislabelled or debatable &ldquo;threat&rdquo;
        comments, such as <Redacted text="&ldquo;shov it up ur ass&rdquo;" offensive />. With only 34 threats in the
        sample, two examples moved the score a lot.
      </>
    ),
    lesson: 'With rare labels, read the examples before you trust the metric.',
  },
  {
    title: 'Merge the two models',
    value: '0.9853',
    valueNote: 'full test set, and 0.9856 on the 54k comments never looked at during development',
    body: (
      <>
        Instead of choosing between the original model and the fine-tuned one, I averaged their weights into a single
        model (a method called WiSE-FT). It runs at exactly the same speed as either. The mix was picked on the
        validation set only, with the selection rule fixed in advance, and 50/50 won.
      </>
    ),
    lesson: 'Fix how you will choose before you look at the results.',
    extra: <MixCurve />,
  },
  {
    title: 'Fix hidden overconfidence',
    value: '0.045 → 0.013',
    valueNote: 'calibration error, about 3.5 times lower',
    body: (
      <>
        A single calibration number looked fine, but the reliability chart told another story: when the model said
        97%, it was right only about 60% of the time. Training on data that was 48% toxic had taught it to expect
        toxicity everywhere, while real comments are about 10% toxic. Two numbers per label, fitted on the validation
        set, fixed it without changing the ranking of a single comment.
      </>
    ),
    lesson: 'Draw the reliability chart. One summary number can hide the problem.',
  },
  {
    title: 'Test it like a product',
    value: '~82%',
    valueNote: 'of decisions automated at the 0.10 / 0.90 lines',
    body: (
      <>
        Finally I tested it the way a real service would use it: a routing policy for automatic decisions, a review of
        the worst errors (much of what remains is label noise), the HateCheck bias suite, a two-step speed trick, and a
        latency race against an LLM API.
      </>
    ),
    lesson: 'Measure what the product will actually do, not only the leaderboard metric.',
  },
]

function Story() {
  const list = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 70%', 'end 60%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <Section id="story" title="The six steps">
      <ol ref={list} className="relative grid gap-8">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[15px] w-[2px] rounded-full bg-line" />
        <m.span
          aria-hidden="true"
          className="spectrum absolute top-2 bottom-2 left-[15px] w-[2px] origin-top rounded-full"
          style={{ scaleY: progress }}
        />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-4 sm:gap-6">
            <span className="num relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-panel text-sm font-medium">
              {i + 1}
            </span>
            <Panel bodyClassName="grid [&>*]:min-w-0 gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_13rem]">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-ink-2">{s.body}</p>
                <p className="mt-4 border-l-2 border-line-strong pl-3 text-sm">
                  <span className="text-ink-3">Lesson: </span>
                  {s.lesson}
                </p>
              </div>
              <div className="md:border-l md:border-line md:pl-5">
                <div className="num text-2xl font-medium tracking-tight">{s.value}</div>
                <p className="mt-1 text-xs text-ink-3">{s.valueNote}</p>
              </div>
              {s.extra && (
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm text-ink-2">Validation ROC-AUC for each mix of the two models</p>
                  {s.extra}
                </div>
              )}
            </Panel>
          </li>
        ))}
      </ol>
    </Section>
  )
}

/* ---------- Speed ---------- */

function Speed() {
  const state = useData('speed')
  const s = state.status === 'ready' ? state.data : null
  const cards = [
    {
      value: '20 to 24/sec',
      title: 'All six questions',
      text: `One T4 GPU. The recorded stream ran at 20.0 comments per second${s ? `, a separate speed test at ${s.gpu_one_step_cps.toFixed(1)}` : ''}.`,
    },
    {
      value: s ? `${s.gpu_two_step_cps.toFixed(1)}/sec` : '',
      title: 'Two-step check',
      text: s
        ? `One T4 GPU. Ask “toxic?” first and the other five only when P(toxic) is 0.10 or more. About 27% of comments need the full check, ${s.two_step_avg_questions.toFixed(2)} questions on average. Mean ROC-AUC ${s.two_step_mean_auc.toFixed(4)} instead of ${s.one_step_mean_auc.toFixed(4)}.`
        : '',
    },
    {
      value: s ? `${s.cpu_sec_per_comment_6q.toFixed(1)} s` : '',
      title: 'On a small CPU',
      text: s
        ? `Two CPU threads, official library, all six questions per comment. The toxic question alone takes ${s.cpu_sec_per_comment_1q.toFixed(1)} s.`
        : '',
    },
    {
      value: '76 ms',
      title: 'One comment at a time',
      text: 'Median on one T4 GPU, against 1,840 ms for Gemini 2.5 Flash over its API on the same 22 comments.',
    },
  ]
  return (
    <Section
      id="speed"
      title="Speed"
      lede="Laya only answers yes or no instead of writing text, which keeps it fast and cheap. Every figure below names the hardware it was measured on."
    >
      <div className="grid [&>*]:min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Panel key={c.title} bodyClassName="p-4 sm:p-5">
            <div className="num min-h-8 text-2xl font-medium tracking-tight">{c.value}</div>
            <div className="mt-1 text-sm font-medium">{c.title}</div>
            <p className="mt-1 text-xs text-ink-3">{c.text}</p>
          </Panel>
        ))}
      </div>
      <Meaning>
        Detoxify&rsquo;s speed was not measured in this project, so none of these numbers compare Laya with Detoxify.
        The comparison is with calling an LLM API, and between Laya&rsquo;s own one-step and two-step modes.
      </Meaning>
    </Section>
  )
}

/* ---------- Limitations ---------- */

const LIMITS = [
  ['Mid-range confidence', 'Calibrated scores between 30% and 80% are still somewhat overconfident on the test set. The two ends are reliable; the middle less so.'],
  ['Automatic removal', 'At the 0.90 line, about 1 in 8 automatic removals was a comment the labellers called clean. A real platform should hide these until a person checks.'],
  ['Imported identity bias', 'Fine-tuning on Jigsaw made neutral identity mentions, negated hate and counter-speech more likely to be wrongly flagged, and plain slurs less likely to be caught.'],
  ['Spelling tricks', 'Hate written with swapped letters, added spaces or leetspeak is often missed. Across the three models, 17% to 59% of these HateCheck cases are caught.'],
  ['Label noise ceiling', 'Some Jigsaw labels are simply wrong, like a condolence message marked toxic. No model can score perfectly against noisy labels.'],
  ['English only', 'Trained and tested only on English Wikipedia talk page comments. Other languages and platforms are untested.'],
  ['Free demo server limits', 'The live demo runs on a shared Hugging Face GPU that is lent out per request. It can take a minute or two to wake up after being idle, and each visitor gets a small daily GPU allowance. After that it answers on the CPU, which takes a few seconds instead of about one.'],
  ['LLM comparison is partial', 'Gemini’s free tier answered only 22 of 100 requests, so only latency is compared. Nothing here says which one moderates better.'],
  ['Custom questions are uncalibrated', 'Calibration was fitted for the six trained questions only. Answers to your own questions use the model’s default confidence.'],
] as const

function Limits() {
  return (
    <Section id="limits" title="Limitations" lede="What this model does not do well, in plain words. These matter more than the headline numbers if you want to use it.">
      <ul className="grid [&>*]:min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LIMITS.map(([title, text]) => (
          <li key={title} className="rounded-xl border border-dashed border-line-strong p-4">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-ink-2">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* ---------- Notebooks ---------- */

const NOTEBOOKS = [
  ['phase1_baselines', 'TF-IDF, Detoxify and zero-shot Laya baselines'],
  ['phase2_finetune', 'Fine-tuning on Kaggle’s 2×T4 GPUs'],
  ['phase2b_rescore', 'Re-scoring without rounding to check the threat drop'],
  ['phase2c_merge_final', 'WiSE-FT weight merge and the final test'],
  ['phase3_eval_demo_data', 'Routing, HateCheck, speed, the LLM race and the demo data'],
  ['phase3b_calibration_fix', 'Per-label Platt scaling for calibration'],
] as const

function Notebooks() {
  return (
    <Section id="notebooks" title="Notebooks" lede="Every number on this site comes from one of these Kaggle notebooks, saved with their outputs.">
      <ol className="grid [&>*]:min-w-0 gap-3 md:grid-cols-2">
        {NOTEBOOKS.map(([file, text], i) => (
          <li key={file}>
            <a
              href={`${LINKS.github}/blob/main/notebooks/${file}.ipynb`}
              target="_blank"
              rel="noreferrer"
              className="panel group flex items-start gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <FileCode2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-3 group-hover:text-ink" />
              <span className="min-w-0">
                <span className="num block truncate text-sm font-medium">
                  {i + 1}. {file}.ipynb
                </span>
                <span className="mt-0.5 block text-sm text-ink-2">{text}</span>
              </span>
              <span className="sr-only">(opens on GitHub in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </Section>
  )
}
