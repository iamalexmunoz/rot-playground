/**
 * state.ts: the "sculpting engine".
 *
 * Every axis keeps two numbers:
 *   target: where we WANT the axis to be (set by sliders, dragging, chips, Randomize, Animate)
 *   value:  what is actually drawn on screen right now
 *
 * Once per frame, `value` glides part of the way toward `target`. That single idea
 * gives every change the same soft easing, so we don't need separate animation
 * code for each feature.
 */
import type { Axis } from './font'

/** 'quick' for direct manipulation (sliders, drag); 'gentle' for chips & Randomize. */
export type Speed = 'quick' | 'gentle'

/** Share of the remaining distance covered each frame (at 60 fps). Higher = snappier. */
const SMOOTHING: Record<Speed, number> = { quick: 0.3, gentle: 0.06 }

export interface AxisState {
  axis: Axis
  value: number
  target: number
  speed: Speed
}

export const state = {
  axes: [] as AxisState[],
  animating: false,
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function findAxis(tag: string | undefined): AxisState | undefined {
  return state.axes.find((a) => a.axis.tag === tag)
}

/** Start fresh with a new font's axes, each at its default value. */
export function setAxes(axes: Axis[]) {
  state.animating = false
  state.axes = axes.map((axis) => ({ axis, value: axis.default, target: axis.default, speed: 'quick' }))
}

/** Ask an axis to move to a new value. It will ease there over the next frames. */
export function setTarget(tag: string, v: number, speed: Speed = 'quick') {
  const a = findAxis(tag)
  if (!a) return
  a.target = clamp(v, a.axis.min, a.axis.max)
  a.speed = speed
}

export function randomize() {
  state.animating = false
  for (const a of state.axes) {
    setTarget(a.axis.tag, a.axis.min + Math.random() * (a.axis.max - a.axis.min), 'gentle')
  }
}

/** Glide to a named instance. Axes the instance doesn't mention go back to default. */
export function goToInstance(coords: Record<string, number>) {
  state.animating = false
  for (const a of state.axes) {
    setTarget(a.axis.tag, coords[a.axis.tag] ?? a.axis.default, 'gentle')
  }
}

// ---------------------------------------------------------------------------
// Animate: every axis swings between its min and max on a sine wave.
// Each axis has a slightly different period, so the text never repeats exactly.
// ---------------------------------------------------------------------------

let animStart = 0
let phases: number[] = []

/** Seconds for one full breath of axis number i. */
const periodFor = (i: number) => 8 + i * 1.7

export function setAnimating(on: boolean) {
  state.animating = on
  if (!on) return
  animStart = performance.now()
  // Pick each wave's starting phase so it begins exactly at the axis's current
  // value. Without this, turning Animate on would make the text jump.
  phases = state.axes.map((a) => {
    const { min, max } = a.axis
    const normalized = max === min ? 0 : ((a.value - min) / (max - min)) * 2 - 1 // -1..1
    return Math.asin(clamp(normalized, -1, 1))
  })
}

/** Advance one frame. `now` is in ms, `dt` is seconds since the last frame. */
export function step(now: number, dt: number) {
  if (state.animating) {
    const t = (now - animStart) / 1000
    state.axes.forEach((a, i) => {
      const mid = (a.axis.min + a.axis.max) / 2
      const half = (a.axis.max - a.axis.min) / 2
      a.target = mid + half * Math.sin((t * 2 * Math.PI) / periodFor(i) + phases[i])
      a.speed = 'quick'
    })
  }

  for (const a of state.axes) {
    // Convert the per-frame smoothing into one that's correct for this frame's
    // real duration, so the easing feels the same at 60 Hz and 120 Hz.
    const k = 1 - Math.pow(1 - SMOOTHING[a.speed], dt * 60)
    a.value += (a.target - a.value) * k
    // Snap when we're practically there, so values settle to clean numbers.
    if (Math.abs(a.target - a.value) < (a.axis.max - a.axis.min) * 1e-4) a.value = a.target
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Small ranges (e.g. 0–1) need decimals; big ones (100–900) don't. */
export function decimalsFor(axis: Axis): number {
  const range = axis.max - axis.min
  if (range <= 1) return 3
  if (range <= 10) return 2
  if (range <= 100) return 1
  return 0
}

/** A value rounded for display, without trailing zeros: 12.50 → "12.5". */
export function formatValue(axis: Axis, v: number): string {
  return String(Number(v.toFixed(decimalsFor(axis))))
}

/** The value for CSS font-variation-settings, e.g. "wght" 700, "slnt" -5 */
export function variationSettings(): string {
  if (state.axes.length === 0) return 'normal'
  return state.axes.map((a) => `"${a.axis.tag}" ${formatValue(a.axis, a.value)}`).join(', ')
}
