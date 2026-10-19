/**
 * font.ts: loading fonts and reading their variation axes.
 *
 * We use fontkit only to *read* the file (axes + named instances).
 * The browser draws the text itself, via the FontFace API and CSS.
 */
import { create, type Font } from 'fontkit'

export interface Axis {
  tag: string // 4-letter code, e.g. "wght"
  name: string // human name, e.g. "Weight"
  min: number
  default: number
  max: number
}

export interface Instance {
  name: string // e.g. "Bold"
  coords: Record<string, number> // e.g. { wght: 700 }
}

export interface LoadedFont {
  family: string // the CSS font-family name we registered it under
  displayName: string // what we show in the UI
  axes: Axis[]
  instances: Instance[]
  source: Font // fontkit's parsed font, used for the SVG export
}

// Every loaded font gets a fresh CSS family name, so a swapped font never
// gets confused with the previous one.
let loadCount = 0

/** Read a font file's bytes, register it with the browser, and describe its axes. */
export async function loadFont(buffer: ArrayBuffer, fileName: string): Promise<LoadedFont> {
  // 1. Parse with fontkit. A .ttc file holds several fonts, so we take the first.
  //    (fontkit's types ask for a Node Buffer, but a Uint8Array works in the browser.)
  const parsed = create(new Uint8Array(buffer) as any)
  const font = 'fonts' in parsed ? parsed.fonts[0] : parsed

  // 2. Axes come from the font's "fvar" table. fontkit exposes them as { wght: {...}, ... }.
  const axes: Axis[] = Object.entries(font.variationAxes).map(([tag, a]) => ({
    tag,
    name: a!.name,
    min: a!.min,
    default: a!.default,
    max: a!.max,
  }))

  // 3. Named instances ("Bold", "Light", ...) also live in fvar.
  //    fontkit's type definitions forget this property, hence the cast.
  const named = ((font as any).namedVariations ?? {}) as Record<string, Record<string, number>>
  const instances: Instance[] = Object.entries(named).map(([name, coords]) => ({ name, coords }))

  // 4. Register the same bytes with the browser so CSS can use it.
  const family = `Playground Font ${++loadCount}`
  const face = new FontFace(family, buffer)
  await face.load()
  document.fonts.add(face)

  return { family, displayName: font.familyName || fileName, axes, instances, source: font }
}

/**
 * Load the font to start with:
 *   1. your own font in ./fonts (kept out of git, so it only exists on your machine)
 *   2. otherwise the open-licensed font in ./default-font (what the public site uses)
 *
 * `import.meta.glob` is a Vite feature: at build time it lists the matching files
 * and gives us a URL for each one. Vite reads these calls while building, so the
 * pattern and options must be written out right here (not passed in a variable).
 */
export async function loadDefaultFont(): Promise<LoadedFont | null> {
  const ownFonts = import.meta.glob('/fonts/*.{ttf,otf,woff,woff2,TTF,OTF,WOFF,WOFF2}', {
    query: '?url',
    import: 'default',
    eager: true,
  })
  const openFonts = import.meta.glob('/default-font/*.{ttf,otf,woff,woff2}', {
    query: '?url',
    import: 'default',
    eager: true,
  })

  const [path, url] = (Object.entries(ownFonts)[0] ?? Object.entries(openFonts)[0] ?? []) as string[]
  if (!url) return null

  const response = await fetch(url)
  return loadFont(await response.arrayBuffer(), path.split('/').pop()!)
}
