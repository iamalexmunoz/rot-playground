# Font Playground

A small playground for sculpting a variable font by moving its axes.
The axes and named instances are read from the font file itself, so it works with any variable font.

**Try it:** https://iamalexmunoz.github.io/rot-playground/

## Run it

```sh
npm install     # first time only
npm run dev     # then open the URL it prints (usually http://localhost:5173)
```

## Fonts

- **Drop any font:** drag a `.ttf`, `.otf`, `.woff` or `.woff2` file onto the page.
  It's read in your browser and never uploaded anywhere.
- **Your own default font:** put it in `./fonts/` (keep just one file there) and reload.
  `fonts/` is in `.gitignore`, so a private or commercial font never ends up on GitHub.
- **The public default:** with `./fonts/` empty (as on GitHub Pages), the playground opens with
  [Roboto Flex](https://github.com/googlefonts/roboto-flex) from `./default-font/`,
  licensed under the SIL Open Font License (see `default-font/OFL.txt`).

Static (non-variable) fonts load too. They just have no sliders.

## How to use it

| Do this                       | To                                                     |
| ----------------------------- | ------------------------------------------------------ |
| Move the mouse over the canvas | Sculpt: left→right and bottom→top each sweep an axis (pick them in the panel) |
| Click the empty canvas        | Hold the current shape / go back to sculpting          |
| Click the word                | Edit the text, "rot" by default (Esc to stop editing) |
| Move a slider                 | Change one axis. Double-click a slider to reset it     |
| Click an instance chip        | Glide to that named instance                           |
| `Space`                       | Toggle Animate (every axis breathes)                   |
| `R`                           | Randomize                                              |
| `H`                           | Hide / show the controls                               |
| Copy CSS                      | Copy the current `font-variation-settings` line        |
| Download SVG                  | Save the word as outlines, exactly as it looks now     |

## How the code is organized

```
index.html      page layout: the canvas and the bottom panel
src/main.ts     wires everything together, keyboard shortcuts, drag & drop
src/font.ts     loads a font, reads its axes & instances with fontkit
src/state.ts    axis values + the easing loop, Randomize, Animate
src/ui.ts       builds sliders, chips and menus from the axes
src/mouse.ts    sculpting with the mouse position
src/svg.ts      exporting the word as an SVG file
src/style.css   all styling. Change --accent to re-theme
default-font/   the open font the public site starts with
```

The key idea is in `src/state.ts`. Each axis has a **target** (where you asked it to go)
and a **value** (what is drawn). Every frame, the value glides a little toward the target.
That one rule gives every change the same easing.

Chips, Randomize, sliders and Animate put the mouse on hold, so their result stays
when the mouse moves back over the canvas. Click the canvas to sculpt with the mouse again.

## Publishing

Every push to `main` builds the site and deploys it to GitHub Pages
(see `.github/workflows/deploy.yml`). Progress shows in the repo's **Actions** tab.
