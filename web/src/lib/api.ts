import { useEffect, useRef, useState } from 'react'
import type { Label } from './labels'

export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export type Decision = 'approve' | 'review' | 'remove'
export interface Stage1 {
  p: { toxic: number }
  decision: Decision
  ms: number
}
export interface Stage2 {
  p: Record<Exclude<Label, 'toxic'>, number>
  ms: number
}
export interface AskResult {
  p_yes: number
  calibrated: false
  ms: number
}

export class ApiError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

/** Waits that add up to about three minutes, enough for a free Space to wake up. */
const BACKOFF_MS = [2000, 3000, 5000, 8000, 10000, 15000, 15000, 20000, 20000, 25000, 30000, 30000]

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

/** True for answers that mean "still starting up", which are worth retrying. */
const isWaking = (status: number) => status === 502 || status === 503 || status === 504

async function request<T>(path: string, init: RequestInit, onWaking?: () => void, signal?: AbortSignal): Promise<T> {
  if (!API_URL) throw new ApiError('The live model is not connected on this copy of the site.')
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null
    try {
      res = await fetch(`${API_URL}${path}`, { ...init, signal })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      // Network error: a sleeping Space often drops the connection while it boots.
    }
    if (res?.ok) return (await res.json()) as T
    if (res && res.status === 429) throw new ApiError('Too many requests from your connection. Please wait a minute.', 429)
    if (res && res.status === 422) throw new ApiError('That input is not valid. Check the length limits and try again.', 422)
    if (res && !isWaking(res.status)) throw new ApiError(`The server answered with an error (${res.status}).`, res.status)
    if (attempt >= BACKOFF_MS.length) throw new ApiError('The model did not wake up in time. Please try again in a minute.')
    onWaking?.()
    await sleep(BACKOFF_MS[attempt], signal)
  }
}

const post = <T>(path: string, body: unknown, onWaking?: () => void, signal?: AbortSignal) =>
  request<T>(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    onWaking,
    signal,
  )

export const api = {
  stage1: (text: string, onWaking?: () => void, signal?: AbortSignal) =>
    post<Stage1>('/predict/stage1', { text }, onWaking, signal),
  stage2: (text: string, onWaking?: () => void, signal?: AbortSignal) =>
    post<Stage2>('/predict/stage2', { text }, onWaking, signal),
  ask: (text: string, question: string, onWaking?: () => void, signal?: AbortSignal) =>
    post<AskResult>('/ask', { text, question }, onWaking, signal),
}

export type ServerState = 'offline' | 'checking' | 'waking' | 'ready' | 'error'

/**
 * Pings /health as soon as the page opens, so a sleeping Space starts waking before the visitor
 * clicks anything. Keeps polling until the model reports it is loaded.
 */
export function useServer() {
  const [state, setState] = useState<ServerState>(API_URL ? 'checking' : 'offline')
  const [since] = useState(() => Date.now())
  const [message, setMessage] = useState<string | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    if (!API_URL) return
    alive.current = true
    const controller = new AbortController()
    ;(async () => {
      for (let attempt = 0; alive.current; attempt++) {
        try {
          const res = await fetch(`${API_URL}/health`, { signal: controller.signal })
          if (res.ok) {
            const h = (await res.json()) as { status: string; model_loaded: boolean; error?: string }
            if (h.status === 'error') {
              setState('error')
              setMessage(h.error ?? 'The model failed to load.')
              return
            }
            if (h.model_loaded) {
              setState('ready')
              return
            }
          }
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
        }
        setState('waking')
        if (attempt >= BACKOFF_MS.length) {
          setState('error')
          setMessage('The model server did not respond.')
          return
        }
        await sleep(BACKOFF_MS[attempt], controller.signal).catch(() => undefined)
      }
    })()
    return () => {
      alive.current = false
      controller.abort()
    }
  }, [])

  return { state, since, message, markReady: () => setState('ready'), markWaking: () => setState('waking') }
}
