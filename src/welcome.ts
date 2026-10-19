/**
 * welcome.ts: a short "how it works" card, shown on your first visit.
 *
 * It uses the browser's built-in <dialog> element, which already handles
 * focus and closing with Esc. We only remember that it was seen, so it
 * doesn't come back every visit (the "?" button reopens it).
 */
const SEEN_KEY = 'rot-playground:welcome-seen'

const dialog = document.getElementById('welcome') as HTMLDialogElement

export function isWelcomeOpen() {
  return dialog.open
}

export function openWelcome() {
  dialog.showModal()
}

export function setupWelcome() {
  // Clicking the dimmed area around the card closes it. Those clicks land on the
  // <dialog> itself; clicks on the card land on its children.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    // Storage can be blocked (e.g. private windows); the card then just shows again next time.
    try {
      localStorage.setItem(SEEN_KEY, 'yes')
    } catch {}
  })
  document.getElementById('help-btn')!.addEventListener('click', openWelcome)

  let seen = false
  try {
    seen = localStorage.getItem(SEEN_KEY) === 'yes'
  } catch {}
  if (!seen) openWelcome()
}
