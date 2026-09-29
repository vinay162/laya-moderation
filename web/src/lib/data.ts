import { useEffect, useState } from 'react'
import type { Label } from './labels'

type Six = [number, number, number, number, number, number]
type PerLabel<T> = Record<Label, T>

export interface StreamComment {
  text: string
  y: Six
  p: Six
  t: number
}

export interface StreamLog {
  device: string
  questions_per_comment: number
  calibration: string
  comments_per_sec: number
  comments: StreamComment[]
}

export interface RaceEntry {
  text: string
  y: Six
  laya: { ms: number; p: Six }
  gemini: { ok: boolean; ms?: number; p?: Six }
}

export interface RoutingPoints {
  p: number[]
  y: number[]
}

export interface RoutingRow {
  approve_below: number
  remove_above: number
  'auto_removed_%': number
  'auto_approved_%': number
  'to_human_%': number
  'removal_precision_%': number
  'toxic_missed_in_approved_%': number
}

export interface ReliabilityBin {
  bin: string
  mean_pred: number
  observed: number
  n: number
}

export interface CalibrationRow {
  label: Label | 'all (pooled)'
  'ECE before': number
  'ECE after': number
  'Brier before': number | null
  'Brier after': number | null
  'right when >=90% (before)': number | null
  'right when >=90% (after)': number | null
  'AUC before': number | null
  'AUC after': number | null
}

export interface Calibration {
  method: string
  platt: PerLabel<{ a: number; b: number }>
  set: string
  table: CalibrationRow[]
  pooled_bins_before: ReliabilityBin[]
  pooled_bins_after: ReliabilityBin[]
}

export interface Platt {
  questions: PerLabel<{ type: string; instructions: string }>
  platt: PerLabel<{ a: number; b: number }>
  max_chars: number
}

export interface HatecheckCalibrated {
  AUC: number
  accuracy: number
  'hateful caught': number
  'non-hateful wrongly flagged': number
}

export interface Hatecheck {
  summary: Record<string, { zero_shot: number; merged: number; detoxify: number }>
  per_functionality: {
    index: string
    zero_shot: number
    merged: number
    detoxify: number
    gold: 'hateful' | 'non-hateful'
  }[]
}

export type AucRow = PerLabel<number> & { mean: number }

export interface Scoreboard {
  full_test: Record<'TF-IDF + LR' | 'Detoxify original' | 'Laya merged (ours)', AucRow>
  sample_10k: Record<'zero_shot' | 'fine_tuned' | 'merged', AucRow>
}

export interface Speed {
  gpu_one_step_cps: number
  gpu_two_step_cps: number
  two_step_avg_questions: number
  two_step_mean_auc: number
  one_step_mean_auc: number
  cpu_sec_per_comment_6q: number
  cpu_sec_per_comment_1q: number
}

export interface Errors {
  false_positives: { p_toxic: number; text: string }[]
  false_negatives: { p_toxic: number; text: string }[]
}

export interface Calibration3Models {
  zero_shot: { ece: number; bins: ReliabilityBin[] }
  fine_tuned: { ece: number; bins: ReliabilityBin[] }
  merged: { ece: number; bins: ReliabilityBin[] }
}

interface DataFiles {
  stream_log: StreamLog
  race_log: RaceEntry[]
  routing_points: RoutingPoints
  routing_table: RoutingRow[]
  calibration: Calibration
  platt: Platt
  hatecheck_calibrated: HatecheckCalibrated
  hatecheck: Hatecheck
  scoreboard: Scoreboard
  speed: Speed
  errors: Errors
  calibration_3models: Calibration3Models
}

export type DataName = keyof DataFiles

const cache = new Map<DataName, Promise<unknown>>()

export function loadData<K extends DataName>(name: K): Promise<DataFiles[K]> {
  let pending = cache.get(name)
  if (!pending) {
    pending = fetch(`/data/${name}.json`).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${name}.json (${res.status})`)
      return res.json()
    })
    pending.catch(() => cache.delete(name))
    cache.set(name, pending)
  }
  return pending as Promise<DataFiles[K]>
}

export type DataState<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: T }

/** Loads a data file once `enabled` is true (used to lazy-load heavy files). */
export function useData<K extends DataName>(name: K, enabled = true): DataState<DataFiles[K]> {
  const [state, setState] = useState<DataState<DataFiles[K]>>({ status: 'loading' })
  useEffect(() => {
    if (!enabled) return
    let live = true
    loadData(name).then(
      (data) => live && setState({ status: 'ready', data }),
      (err: Error) => live && setState({ status: 'error', error: err.message }),
    )
    return () => {
      live = false
    }
  }, [name, enabled])
  return state
}
