/**
 * svg.ts: export the word, exactly as it's sculpted right now, as an SVG file.
 *
 * The browser can't hand us the outlines it draws, so we ask fontkit instead:
 * it builds the font at the current axis values, lays out the text, and gives
 * us each glyph's outline as SVG path data.
 */
import type { Font } from 'fontkit'

/** Trim long decimals so the file stays small: 12.3456789 → 12.35 */
const tidy = (d: string) => d.replace(/-?\d*\.\d+/g, (n) => String(Number(Number(n).toFixed(2))))

export function buildSvg(
  font: Font,
  text: string,
  fontSize: number,
  coords: Record<string, number>,
  color: string,
  cssLine: string,
): string | null {
  // A copy of the font with the axes set to our values.
  const variant = Object.keys(coords).length > 0 ? font.getVariation(coords) : font
  const scale = fontSize / variant.unitsPerEm // font units → pixels
  const lineHeight = fontSize * 1.05 // same as the specimen's CSS line-height

  const paths: string[] = []
  // Track the outer edges of all glyphs, so the SVG fits the word snugly.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  text.split('\n').forEach((line, lineIndex) => {
    const run = variant.layout(line) // shaping: picks glyphs, kerning, ligatures
    const baseline = lineIndex * lineHeight
    let penX = (-run.advanceWidth * scale) / 2 // center each line, like on screen

    run.glyphs.forEach((glyph, i) => {
      const pos = run.positions[i]
      // Font outlines point y up; SVG points y down. Scaling y by -1 flips it.
      const path = glyph.path
        .scale(scale, -scale)
        .translate(penX + pos.xOffset * scale, baseline - pos.yOffset * scale)

      if (path.commands.length > 0) {
        paths.push(`  <path d="${tidy(path.toSVG())}"/>`)
        const box = path.bbox
        minX = Math.min(minX, box.minX)
        minY = Math.min(minY, box.minY)
        maxX = Math.max(maxX, box.maxX)
        maxY = Math.max(maxY, box.maxY)
      }
      penX += pos.xAdvance * scale
    })
  })

  if (paths.length === 0) return null // only spaces, nothing to draw

  const pad = fontSize * 0.05
  const x = minX - pad
  const y = minY - pad
  const w = maxX - minX + pad * 2
  const h = maxY - minY + pad * 2
  const r = (n: number) => Number(n.toFixed(2))

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(x)} ${r(y)} ${r(w)} ${r(h)}" width="${r(w)}" height="${r(h)}">`,
    `<!-- ${font.familyName} · ${cssLine.replace(/--/g, '')} -->`,
    `<g fill="${color}">`,
    ...paths,
    `</g>`,
    `</svg>`,
  ].join('\n')
}

/** Hand a text file to the browser as a download. */
export function downloadFile(contents: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000) // give the download a moment to start
}
