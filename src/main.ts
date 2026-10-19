/**
 * main.ts: wires everything together.
 *
 *   font.ts   loads a font and reads its axes
 *   state.ts  holds axis values and eases them every frame
 *   ui.ts     builds sliders / chips / menus from the axes
 *   mouse.ts  sculpting with the mouse position
 *   svg.ts    exporting the word as an SVG file
 *   welcome.ts  the first-visit introduction card
 */
import { loadFont, loadDefaultFont, type LoadedFont } from './font'
import { state, setAxes, setAnimating, randomize, step, variationSettings } from './state'
import { buildSliders, updateSliders, buildChips, buildMouseMenus, syncAnimateButton, toast, escapeHtml, setFill } from './ui'
import { enableMouseSculpt, holdMouse, updateHint } from './mouse'
import { buildSvg, downloadFile } from './svg'
import { setupWelcome, isWelcomeOpen } from './welcome'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const stage = $('stage')
const specimen = $('specimen')
const panel = $('panel')

let currentFont: LoadedFont | null = null

// ---------------------------------------------------------------------------
// Using a font: rebuild every control around its axes.
// ---------------------------------------------------------------------------

function useFont(font: LoadedFont) {
  currentFont = font
  specimen.style.fontFamily = `"${font.family}", system-ui`
  setAxes(font.axes)
  buildSliders()
  buildChips(font.instances)
  buildMouseMenus()
  syncAnimateButton()
  updateHint()

  const axisCount = `${font.axes.length} ${font.axes.length === 1 ? 'axis' : 'axes'}`
  $('font-name').innerHTML = `<strong>${escapeHtml(font.displayName)}</strong> <span>${axisCount}</span>`
}

// ---------------------------------------------------------------------------
// The frame loop: ease the values, then draw them.
// ---------------------------------------------------------------------------

let lastFrame = performance.now()
function frame(now: number) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1) // cap, in case the tab was asleep
  lastFrame = now
  step(now, dt)
  specimen.style.fontVariationSettings = variationSettings()
  updateSliders()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// ---------------------------------------------------------------------------
// Buttons & settings
// ---------------------------------------------------------------------------

function toggleAnimate() {
  setAnimating(!state.animating)
  syncAnimateButton()
  holdMouse() // so the mouse doesn't take over when Animate stops
}

function doRandomize() {
  randomize()
  syncAnimateButton()
  holdMouse() // keep the random result until you click the canvas
}

async function copyCss() {
  const line = `font-variation-settings: ${variationSettings()};`
  try {
    await navigator.clipboard.writeText(line)
    toast('Copied: ' + line)
  } catch {
    toast('Could not copy. Your browser blocked clipboard access.')
  }
}

function downloadSvg() {
  if (!currentFont) return
  // innerText keeps line breaks; drop the trailing one some browsers add.
  const text = specimen.innerText.replace(/\n$/, '')
  const coords = Object.fromEntries(state.axes.map((a) => [a.axis.tag, a.value]))
  const svg = buildSvg(
    currentFont.source,
    text,
    Number(sizeInput.value),
    coords,
    getComputedStyle(specimen).color,
    `font-variation-settings: ${variationSettings()};`,
  )
  if (!svg) return toast('Nothing to export. Type something first.')

  // e.g. "rot-harber.svg"
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'text'
  downloadFile(svg, `${slug(text).slice(0, 40)}-${slug(currentFont.displayName)}.svg`, 'image/svg+xml')
}

function toggleUi() {
  document.body.classList.toggle('ui-hidden')
  if (document.body.classList.contains('ui-hidden')) toast('Press H to bring the controls back')
}

$('animate-btn').addEventListener('click', toggleAnimate)
$('random-btn').addEventListener('click', doRandomize)
$('copy-btn').addEventListener('click', copyCss)
$('svg-btn').addEventListener('click', downloadSvg)

$('collapse-btn').addEventListener('click', () => {
  const collapsed = panel.classList.toggle('collapsed')
  $('collapse-btn').setAttribute('aria-expanded', String(!collapsed))
})

const sizeInput = $<HTMLInputElement>('size')
const applySize = () => {
  specimen.style.fontSize = sizeInput.value + 'px'
  $('size-out').textContent = sizeInput.value + 'px'
  setFill(sizeInput)
}
sizeInput.addEventListener('input', applySize)
applySize()

enableMouseSculpt(stage, specimen)
setupWelcome()

// ---------------------------------------------------------------------------
// Keyboard: Space = Animate, R = Randomize, H = hide UI, Esc = stop editing.
// ---------------------------------------------------------------------------

/** True when the key press belongs to a text field, not to our shortcuts. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')
}

window.addEventListener('keydown', (e) => {
  if (isWelcomeOpen()) return // keys belong to the welcome card while it's open
  if (e.key === 'Escape') return specimen.blur()
  if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return

  if (e.code === 'Space') {
    e.preventDefault() // otherwise Space would also "click" a focused button
    toggleAnimate()
  } else if (e.key === 'r' || e.key === 'R') {
    doRandomize()
  } else if (e.key === 'h' || e.key === 'H') {
    toggleUi()
  }
})
// Some browsers press a focused button on Space *release*, so block that too.
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && !isTyping(e.target) && !isWelcomeOpen()) e.preventDefault()
})

// ---------------------------------------------------------------------------
// Drag & drop a font file anywhere to swap it in.
// ---------------------------------------------------------------------------

let dragDepth = 0 // dragenter/leave fire for every child element, so we count
window.addEventListener('dragenter', (e) => {
  e.preventDefault()
  if (dragDepth++ === 0) document.body.classList.add('dropping')
})
window.addEventListener('dragleave', () => {
  if (--dragDepth === 0) document.body.classList.remove('dropping')
})
window.addEventListener('dragover', (e) => e.preventDefault()) // required to allow dropping
window.addEventListener('drop', async (e) => {
  e.preventDefault()
  dragDepth = 0
  document.body.classList.remove('dropping')

  const file = e.dataTransfer?.files[0]
  if (!file) return
  try {
    useFont(await loadFont(await file.arrayBuffer(), file.name))
    toast(`Loaded ${file.name}`)
  } catch (err) {
    console.error(err)
    toast(`Couldn't read ${file.name} as a font`)
  }
})

// ---------------------------------------------------------------------------
// Start up with the font in ./fonts.
// ---------------------------------------------------------------------------

loadDefaultFont()
  .then((font) => {
    if (font) useFont(font)
    else $('font-name').textContent = 'No font in ./fonts. Drop one here.'
  })
  .catch((err) => {
    console.error(err)
    $('font-name').textContent = 'Could not load the font in ./fonts'
  })
