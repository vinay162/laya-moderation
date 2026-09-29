import { Ban, Check, CircleAlert, Loader2, MessageCircleQuestion, Send, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { Meaning, Section } from '../components/Section'
import { Page } from '../components/Shell'
import { api, ApiError, useServer, type Decision, type ServerState, type Stage1, type Stage2 } from '../lib/api'
import { LABEL_NAME, LABELS, labelColor, type Label } from '../lib/labels'

const MAX_TEXT = 1200
const MAX_QUESTION = 200

const EXAMPLES = [
  { name: 'Polite', text: 'Thanks for fixing the references, the article reads much better now.' },
  { name: 'Mild insult', text: 'Stop vandalising this page, you clueless troll.' },
  { name: 'Clear insult', text: 'You are an idiot and your edits are garbage.' },
  {
    name: 'Heated but civil',
    text: 'I strongly disagree with this change and I think it makes the section worse. Please discuss it on the talk page before reverting again.',
  },
]

const QUESTION_IDEAS = ['Is this comment sarcastic?', 'Is the writer asking for help?', 'Is this comment about sports?']

const DECISION: Record<Decision, { name: string; text: string; color: string; Icon: typeof Check }> = {
  approve: { name: 'Approve', text: 'P(toxic) is below 0.10, so it would be published automatically.', color: 'var(--ok)', Icon: Check },
  review: { name: 'Send to a person', text: 'P(toxic) is between 0.10 and 0.90, so a moderator would decide.', color: 'var(--review)', Icon: UserRound },
  remove: { name: 'Remove', text: 'P(toxic) is 0.90 or higher, so it would be hidden automatically.', color: 'var(--remove)', Icon: Ban },
}

export default function Try() {
  const server = useServer()
  return (
    <Page>
      <PageHeader title="Try it live">
        Type a comment and the model scores it on a free shared GPU from Hugging Face. Then ask it your own yes or no
        question about the same text.
      </PageHeader>
      <ServerStatus state={server.state} since={server.since} message={server.message} />
      <Analyse waking={server.state === 'waking' || server.state === 'checking'} />
      <p className="mt-10 flex items-start gap-2 text-sm text-ink-3">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        A demo only, not for real moderation decisions. Your text is scored in memory on the server and is never stored
        or logged.
      </p>
    </Page>
  )
}

/* ---------- Server status ---------- */

function ServerStatus({ state, since, message }: { state: ServerState; since: number; message: string | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (state !== 'waking' && state !== 'checking') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [state])
  const secs = Math.max(0, Math.round((now - since) / 1000))

  const view: Record<ServerState, { dot: string; text: string }> = {
    checking: { dot: 'bg-ink-3 animate-pulse', text: 'Connecting to the model…' },
    waking: {
      dot: 'bg-review animate-pulse',
      text: `Waking up the model on Hugging Face. This can take a minute or two (${secs}s so far). You can type while you wait.`,
    },
    ready: {
      dot: 'bg-ok',
      text: 'Model ready. It runs on a free shared GPU from Hugging Face, and on its CPU once your daily GPU time is used.',
    },
    error: { dot: 'bg-remove', text: message ?? 'The model server is not available right now. Please try again later.' },
    offline: { dot: 'bg-ink-3', text: 'The live model is not connected on this copy of the site.' },
  }
  const v = view[state]
  return (
    <div role="status" aria-live="polite" className="mt-6 mb-10 inline-flex items-center gap-2.5 rounded-full border border-line bg-panel px-4 py-2 text-sm">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${v.dot}`} />
      <span className="text-ink-2">{v.text}</span>
    </div>
  )
}

/* ---------- Analyse ---------- */

type Phase = 'idle' | 'stage1' | 'stage2' | 'done'

const message = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

function Analyse({ waking }: { waking: boolean }) {
  const [text, setText] = useState('')
  const [scored, setScored] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [s1, setS1] = useState<Stage1 | null>(null)
  const [s2, setS2] = useState<Stage2 | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useRef(0)

  const busy = phase === 'stage1' || phase === 'stage2'
  const trimmed = text.trim()

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!trimmed || busy) return
    const id = ++run.current
    setError(null)
    setS1(null)
    setS2(null)
    setSkipped(false)
    setScored(trimmed)
    let gotStage1 = false
    try {
      setPhase('stage1')
      const r1 = await api.stage1(trimmed)
      if (id !== run.current) return
      gotStage1 = true
      setS1(r1)
      // Two-step check: only ask the other five questions when the comment might be toxic.
      if (r1.p.toxic >= 0.1) {
        setPhase('stage2')
        const r2 = await api.stage2(trimmed)
        if (id !== run.current) return
        setS2(r2)
      } else {
        setSkipped(true)
      }
      setPhase('done')
    } catch (err) {
      if (id !== run.current) return
      setError(message(err))
      setPhase(gotStage1 ? 'done' : 'idle')
    }
  }

  const scoreRest = async () => {
    if (busy || !scored) return
    const id = ++run.current
    setError(null)
    setPhase('stage2')
    try {
      const r2 = await api.stage2(scored)
      if (id !== run.current) return
      setS2(r2)
      setSkipped(false)
    } catch (err) {
      if (id === run.current) setError(message(err))
    } finally {
      if (id === run.current) setPhase('done')
    }
  }

  const probs: Partial<Record<Label, number>> = { ...(s1 ? { toxic: s1.p.toxic } : {}), ...(s2?.p ?? {}) }

  return (
    <>
      <Section id="analyse" title="Score a comment">
        <div className="grid [&>*]:min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel title="Your comment" source={`Up to ${MAX_TEXT.toLocaleString('en-US')} characters. English works best.`}>
            <form onSubmit={submit} className="grid gap-3">
              <label htmlFor="comment" className="sr-only">
                Comment to score
              </label>
              <textarea
                id="comment"
                value={text}
                maxLength={MAX_TEXT}
                rows={7}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
                }}
                placeholder={'Paste or type a comment…'}
                className="w-full resize-y rounded-lg border border-line bg-sunken px-3 py-2.5 text-[15px] leading-relaxed placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-3">Examples:</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => setText(ex.text)}
                    className="rounded-full border border-line px-3 py-1 text-xs hover:bg-hover"
                  >
                    {ex.name}
                  </button>
                ))}
                <span className="num ml-auto text-xs text-ink-3">
                  {text.length.toLocaleString('en-US')} / {MAX_TEXT.toLocaleString('en-US')}
                </span>
              </div>
              <button
                type="submit"
                disabled={!trimmed || busy}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-opacity disabled:opacity-40"
              >
                {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                {busy ? (waking ? 'Waking up the model…' : 'Scoring…') : 'Analyse'}
              </button>
            </form>
          </Panel>

          <Results phase={phase} s1={s1} s2={s2} probs={probs} skipped={skipped} onScoreRest={scoreRest} error={error} waking={waking} />
        </div>
      </Section>

      <AskOwn text={scored || trimmed} />
    </>
  )
}

function Results(props: {
  phase: Phase
  s1: Stage1 | null
  s2: Stage2 | null
  probs: Partial<Record<Label, number>>
  skipped: boolean
  onScoreRest: () => void
  error: string | null
  waking: boolean
}) {
  const { phase, s1, s2, probs, skipped, onScoreRest, error, waking } = props
  const d = s1 ? DECISION[s1.decision] : null

  return (
    <Panel title="What the model says" source="Calibrated probabilities from the fine-tuned model" className="self-start">
      <div aria-live="polite" className="grid gap-5">
        {phase === 'idle' && !error && <p className="text-sm text-ink-3">Scores appear here after you press Analyse.</p>}

        {phase === 'stage1' && (
          <p className="inline-flex items-center gap-2 text-sm text-ink-2">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            {waking ? 'Waiting for the server to wake up. Your comment will be scored as soon as it is ready.' : 'Asking the toxic question first…'}
          </p>
        )}

        {d && s1 && (
          <div className="flex items-start gap-3 rounded-lg bg-sunken p-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{ background: d.color }}>
              <d.Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Routing decision: {d.name}</p>
              <p className="text-ink-2">{d.text}</p>
            </div>
          </div>
        )}

        {s1 && (
          <ul className="grid gap-2.5">
            {LABELS.map((l) => (
              <Bar key={l} label={l} p={probs[l]} pending={l !== 'toxic' && phase === 'stage2'} skipped={l !== 'toxic' && skipped} />
            ))}
          </ul>
        )}

        {skipped && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-2">
            <p className="max-w-[46ch]">
              The two-step check stopped here: with P(toxic) under 0.10 the other five questions are skipped, which keeps
              the demo fast.
            </p>
            <button type="button" onClick={onScoreRest} className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-hover">
              Score all six anyway
            </button>
          </div>
        )}

        {s1 && (
          <p className="num text-xs text-ink-3">
            Toxic question: {s1.ms.toLocaleString('en-US')} ms on the {s1.device.toUpperCase()},{' '}
            {s1.totalMs.toLocaleString('en-US')} ms round trip
            {s2 && (
              <>
                <br />
                Other five: {s2.ms.toLocaleString('en-US')} ms on the {s2.device.toUpperCase()},{' '}
                {s2.totalMs.toLocaleString('en-US')} ms round trip
              </>
            )}
          </p>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-remove">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </Panel>
  )
}

function Bar({ label, p, pending, skipped }: { label: Label; p?: number; pending: boolean; skipped: boolean }) {
  return (
    <li className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.25rem] items-center gap-3 text-sm">
      <span className="flex items-center gap-2 text-ink-2">
        <span aria-hidden="true" className="h-3 w-[3px] rounded-full" style={{ background: labelColor(label) }} />
        {LABEL_NAME[label]}
      </span>
      <span className="h-2 overflow-hidden rounded-full bg-sunken">
        {p !== undefined && (
          <span className="block h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${p * 100}%`, background: labelColor(label) }} />
        )}
        {pending && <span className="block h-full w-1/3 animate-pulse rounded-full bg-line-strong" />}
      </span>
      <span className="num text-right text-xs">
        {p !== undefined ? p.toFixed(3) : pending ? '…' : skipped ? 'skipped' : ''}
      </span>
    </li>
  )
}

/* ---------- Ask your own question ---------- */

function AskOwn({ text }: { text: string }) {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<{ p: number; ms: number; totalMs: number; device: string; question: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const q = question.trim()
  const ready = text.length > 0 && q.length >= 3

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.ask(text, q)
      setResult({ p: r.p_yes, ms: r.ms, totalMs: r.totalMs, device: r.device, question: q })
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      id="ask"
      title="Ask your own question"
      lede="This is what makes Laya different from a fixed classifier. Questions are plain English at request time, so it can answer one it was never trained on, without any retraining."
    >
      <Panel title="Your question" source="About the comment above. Up to 200 characters, answered yes or no.">
        <form onSubmit={submit} className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="question" className="sr-only">
              Your yes or no question
            </label>
            <input
              id="question"
              value={question}
              maxLength={MAX_QUESTION}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Is this comment sarcastic?"
              className="min-w-0 flex-1 rounded-lg border border-line bg-sunken px-3 py-2.5 text-[15px] placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
            />
            <button
              type="submit"
              disabled={!ready || busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-40"
            >
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <MessageCircleQuestion aria-hidden="true" className="h-4 w-4" />}
              Ask
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3">Ideas:</span>
            {QUESTION_IDEAS.map((idea) => (
              <button key={idea} type="button" onClick={() => setQuestion(idea)} className="rounded-full border border-line px-3 py-1 text-xs hover:bg-hover">
                {idea}
              </button>
            ))}
          </div>
          {!text && <p className="text-sm text-ink-3">Write a comment in the box above first.</p>}

          <div aria-live="polite">
            {result && (
              <div className="rounded-lg bg-sunken p-4">
                <p className="text-sm text-ink-2">{result.question}</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="num text-3xl font-medium">{(result.p * 100).toFixed(1)}%</span>
                  <span className="text-sm text-ink-2">chance the answer is yes</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel">
                  <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${result.p * 100}%` }} />
                </div>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-review/50 bg-review/10 px-2.5 py-1 text-xs font-medium">
                  Uncalibrated: custom questions use the model&rsquo;s default confidence
                </p>
                <p className="num mt-2 text-xs text-ink-3">
                  {result.ms.toLocaleString('en-US')} ms on the {result.device.toUpperCase()},{' '}
                  {result.totalMs.toLocaleString('en-US')} ms round trip
                </p>
              </div>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-remove">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
          </div>
        </form>
      </Panel>
      <Meaning>
        The six moderation questions were calibrated on validation data, so their percentages mean what they say. Your
        own questions were not, so treat the number as a rough lean, not a measured probability.
      </Meaning>
    </Section>
  )
}
