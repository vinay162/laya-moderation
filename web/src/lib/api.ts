import type { Client, SpaceStatus } from '@gradio/client'
import { useEffect, useState } from 'react'
import type { Label } from './labels'

/** The Hugging Face Space that serves the model, e.g. "Vinay57/laya-moderation-demo". */
export const SPACE = (import.meta.env.VITE_HF_SPACE ?? '').trim()

export type Decision = 'approve' | 'review' | 'remove'
/** The Space uses a shared GPU when one is available for this visitor, and its CPU otherwise. */
export type Device = 'gpu' | 'cpu'
export interface Stage1 {
  p: { toxic: number }
  decision: Decision
  /** Time the model itself took, measured on the server. */
  ms: number
  device: Device
  /** Full round trip seen by the browser, including network and GPU queue. */
  totalMs: number
}
export interface Stage2 {
  p: Record<Exclude<Label, 'toxic'>, number>
  ms: number
  device: Device
  totalMs: number
}
export interface AskResult {
  p_yes: number
  calibrated: false
  ms: number
  device: Device
  totalMs: number
}

export class ApiError extends Error {}

export type ServerState = 'offline' | 'checking' | 'waking' | 'ready' | 'error'

type Listener = (state: ServerState, message?: string) => void
const listeners = new Set<Listener>()
let current: { state: ServerState; message?: string } = { state: SPACE ? 'checking' : 'offline' }

function publish(state: ServerState, message?: string) {
  current = { state, message }
  listeners.forEach((l) => l(state, message))
}

function onStatus(s: SpaceStatus) {
  if (s.status === 'running') return
  if (s.status === 'space_error' || s.status === 'paused' || s.status === 'error' || s.status === 'stopped') {
    publish('error', 'The model server is not available right now. Please try again later.')
  } else {
    // sleeping, starting or building: the client keeps waiting until the Space is up.
    publish('waking')
  }
}

let connecting: Promise<Client> | null = null

/**
 * Connects once and reuses the connection. Connecting also wakes a sleeping Space, so the Try page
 * calls this as soon as it opens. The client library is loaded only on that page.
 */
function client(): Promise<Client> {
  if (!SPACE) return Promise.reject(new ApiError('The live model is not connected on this copy of the site.'))
  if (!connecting) {
    connecting = import('@gradio/client')
      .then(({ Client }) => Client.connect(SPACE, { status_callback: onStatus }))
      .then((c) => {
        publish('ready')
        return c
      })
      .catch((e) => {
        connecting = null
        publish('error', 'Could not reach the model server. Please try again in a minute.')
        throw new ApiError(friendly(e))
      })
  }
  return connecting
}

function friendly(e: unknown): string {
  const text = String((e as { message?: string })?.message ?? e)
  if (/quota/i.test(text)) {
    return 'You have used today’s free GPU allowance from Hugging Face. It resets within 24 hours.'
  }
  if (/characters/i.test(text)) return text
  return 'The model server could not answer. Please try again.'
}

async function call<T>(endpoint: string, payload: Record<string, string>): Promise<T & { totalMs: number }> {
  const c = await client()
  const t0 = performance.now()
  try {
    const res = await c.predict(endpoint, payload)
    const data = (res.data as unknown[])[0] as T
    return { ...data, totalMs: Math.round(performance.now() - t0) }
  } catch (e) {
    throw new ApiError(friendly(e))
  }
}

export const api = {
  stage1: (text: string) => call<Omit<Stage1, 'totalMs'>>('/stage1', { text }),
  stage2: (text: string) => call<Omit<Stage2, 'totalMs'>>('/stage2', { text }),
  ask: (text: string, question: string) => call<Omit<AskResult, 'totalMs'>>('/ask', { text, question }),
}

/** Starts connecting as soon as the page opens, and tracks whether the Space is awake. */
export function useServer() {
  const [state, setState] = useState(current)
  const [since] = useState(() => Date.now())
  useEffect(() => {
    const l: Listener = (s, message) => setState({ state: s, message })
    listeners.add(l)
    setState(current)
    client().catch(() => undefined)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return { state: state.state, message: state.message ?? null, since }
}
