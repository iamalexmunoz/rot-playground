/**
 * ui.ts: building the controls from whatever axes the font has.
 * Nothing here is hardcoded per font: sliders, chips and mouse-axis menus
 * are all generated from the font's own data.
 */
import type { Instance } from './font'
import { state, findAxis, setTarget, goToInstance, formatValue, decimalsFor, type AxisState } from './state'
import { holdMouse } from './mouse'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

// Remember each axis's slider + readout so we can update them every frame.
const sliderRefs = new Map<string, { input: HTMLInputElement; out: HTMLElement }>()

/** One slider card per axis: tag, name, current value, slider, and min/default/max. */
export function buildSliders() {
  const container = $('sliders')
  container.innerHTML = ''
  sliderRefs.clear()

  if (state.axes.length === 0) {
    container.innerHTML = '<p class="empty">This font has no variable axes. Try dropping a variable font.</p>'
    return
  }

  for (const a of state.axes) {
    const { tag, name, min, max } = a.axis
    const card = document.createElement('div')
    card.className = 'axis'
    card.innerHTML = `
      <div class="axis-head">
        <span class="tag">${escapeHtml(tag)}</span>
        <span class="name">${escapeHtml(name)}</span>
        <output class="value"></output>
      </div>
      <input type="range" min="${min}" max="${max}" step="${10 ** -decimalsFor(a.axis)}" />
      <div class="axis-range">
        <span>${formatValue(a.axis, min)}</span>
        <span>default ${formatValue(a.axis, a.axis.default)}</span>
        <span>${formatValue(a.axis, max)}</span>
      </div>`

    const input = card.querySelector('input')!
    input.title = 'Double-click to reset'
    input.addEventListener('input', () => {
      setAnimatingOff()
      holdMouse()
      setTarget(tag, Number(input.value))
    })
    input.addEventListener('dblclick', () => setTarget(tag, a.axis.default, 'gentle'))

    sliderRefs.set(tag, { input, out: card.querySelector('output')! })
    container.append(card)
  }
}

/** Called every frame: keep sliders and number readouts in sync with the state. */
export function updateSliders() {
  for (const a of state.axes) {
    const ref = sliderRefs.get(a.axis.tag)
    if (!ref) continue
    // The slider shows where the axis is heading; the number shows where it is now.
    ref.input.value = String(a.target)
    setFill(ref.input)
    ref.out.textContent = formatValue(a.axis, a.value)
  }
}

/** Named instances as clickable chips. */
export function buildChips(instances: Instance[]) {
  const container = $('instances')
  container.innerHTML = ''
  for (const inst of instances) {
    const chip = document.createElement('button')
    chip.className = 'chip'
    chip.textContent = inst.name
    chip.addEventListener('click', () => {
      goToInstance(inst.coords)
      holdMouse()
      syncAnimateButton()
    })
    container.append(chip)
  }
}

/** Fill the two "which axis does the mouse control?" menus. */
export function buildMouseMenus() {
  const fill = (select: HTMLSelectElement, preferred: AxisState | undefined) => {
    select.innerHTML = '<option value="">none</option>'
    for (const a of state.axes) select.add(new Option(`${a.axis.name} (${a.axis.tag})`, a.axis.tag))
    select.value = preferred?.axis.tag ?? ''
  }
  // Defaults: weight up/down, slant left/right. Fonts without those axes
  // fall back to their first two axes.
  const y = findAxis('wght') ?? state.axes[0]
  const x = findAxis('slnt') ?? state.axes.find((a) => a !== y)
  fill($('axis-x'), x)
  fill($('axis-y'), y)
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** Make the Animate button reflect the current state (it can be switched off elsewhere). */
export function syncAnimateButton() {
  $('animate-btn').setAttribute('aria-pressed', String(state.animating))
}

/** Any hands-on change (e.g. a slider) stops the breathing animation. */
export function setAnimatingOff() {
  state.animating = false
  syncAnimateButton()
}

/** Names come from inside the font file, so escape them before putting them in HTML. */
export function escapeHtml(text: string) {
  const span = document.createElement('span')
  span.textContent = text
  return span.innerHTML
}

/** Tell a slider's track how far to draw the accent color (used by the CSS). */
export function setFill(input: HTMLInputElement) {
  const min = Number(input.min), max = Number(input.max)
  const percent = max === min ? 0 : ((Number(input.value) - min) / (max - min)) * 100
  input.style.setProperty('--fill', `${percent}%`)
}

let toastTimer = 0
/** A short message that fades out by itself. */
export function toast(message: string) {
  const el = $('toast')
  el.textContent = message
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 1800)
}
