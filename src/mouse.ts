/**
 * mouse.ts: sculpting with the mouse position.
 *
 * While the canvas is "live", where the mouse sits on it sets two axes directly:
 *   left edge → min, right edge → max   (the ↔ axis)
 *   bottom    → min, top        → max   (the ↕ axis)
 *
 * Because every mouse move changes the shape, you can freeze it:
 *   - click the empty canvas to hold the current shape, click again to go live
 *   - chips, Randomize, sliders and Animate hold it automatically, so their
 *     result doesn't vanish when the mouse comes back over the canvas
 *   - while you edit the word, the mouse doesn't sculpt
 */
import { state, findAxis, setTarget } from './state'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

let live = true
let stage: HTMLElement
let specimen: HTMLElement

const isEditing = () => document.activeElement === specimen

/** Which axes the mouse controls, as picked in the two menus. */
function mouseAxes() {
  return { x: $<HTMLSelectElement>('axis-x').value, y: $<HTMLSelectElement>('axis-y').value }
}

/** Freeze the current shape: the mouse stops sculpting until the canvas is clicked. */
export function holdMouse() {
  live = false
  updateHint()
}

/** Show what the mouse is doing right now, at the top of the canvas. */
export function updateHint() {
  stage.classList.toggle('held', !live)
  let text: string
  if (state.axes.length === 0) text = 'Click the word to edit'
  else if (isEditing()) text = 'Editing · press Esc or click outside to finish'
  else if (live) text = 'Move the mouse to sculpt · click to hold · click the word to edit'
  else text = 'Held · click the canvas to sculpt with the mouse again'
  $('hint').textContent = text
}

export function enableMouseSculpt(stageEl: HTMLElement, specimenEl: HTMLElement) {
  stage = stageEl
  specimen = specimenEl

  stage.addEventListener('pointermove', (e) => {
    if (!live || state.animating || isEditing()) return

    // Turn the mouse position into 0..1 across the canvas.
    const rect = stage.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const fy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))

    const { x, y } = mouseAxes()
    const ax = findAxis(x)
    const ay = findAxis(y)
    if (ax) setTarget(x, ax.axis.min + fx * (ax.axis.max - ax.axis.min))
    // Screen y grows downward, so flip it: the top of the canvas is the max.
    if (ay) setTarget(y, ay.axis.min + (1 - fy) * (ay.axis.max - ay.axis.min))
  })

  // Clicks on the empty canvas toggle hold/live. If you were editing,
  // that first click only finishes editing (the browser blurs the word for us).
  let wasEditing = false
  stage.addEventListener('pointerdown', () => (wasEditing = isEditing()))
  stage.addEventListener('click', (e) => {
    if (specimen.contains(e.target as Node) || wasEditing) return
    live = !live
    updateHint()
  })

  specimen.addEventListener('focus', updateHint)
  specimen.addEventListener('blur', updateHint)
  updateHint()
}
