# Geometry-Aware Conditional Neural Network — NHERI 2026 Presentation

A self-contained, offline-safe **reveal.js** slide deck for the
**2026 Natural Hazards Researchers Meeting** (Boulder, CO — Wed June 17, 2026),
session *"Translating Complexity: Assessment Models and Markets in a Changing
Climate."*

- **Title:** Geometry-Aware Conditional Neural Network–Based Wind Pressure
  Estimation for Buildings
- **Presenter:** Haifeng Wang (Washington State University)
- **Co-authors:** Paolo Bocchini (Lehigh), Jamie E. Padgett (Rice)
- **Length:** 15 core slides for a 10-minute talk + 5 appendix slides (backup for Q&A) = 20 total.

Everything is vendored locally (reveal.js, three.js, the Inter font) — the deck
runs with **no network access** and deploys cleanly to **GitHub Pages**.

---

## File tree

```
site/
├── index.html                     # the deck (15 core + 5 appendix = 20 slides total; 9 vertical-stack columns)
├── README.md                      # this file
├── assets/
│   ├── css/theme.css              # WSU light theme (crimson #981E32 / gray #5E6A71)
│   ├── js/three-building.js       # interactive colored 3D building (Three.js)
│   └── img/                       # all figures used by the deck (PNG)
├── vendor/                        # vendored libraries (offline / GH-Pages safe)
│   ├── reveal/                    # reveal.js 5.1.0 dist + notes & zoom plugins
│   ├── three/                     # three.js 0.169 module + OrbitControls addon
│   └── fonts/                     # self-hosted Inter (woff2, weights 400–700)
└── tools/                         # local-only: decktape + puppeteer (PDF export)
```

The final PDF is written one level up, next to `site/`:
`../Wang-Haifeng_Geometry-Aware-CondNN-Wind-Pressure.pdf`

---

## View locally

From the `site/` directory, serve over HTTP (ES modules + the import map need a
real server — opening `index.html` via `file://` will not work):

```bash
cd site
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

### Controls
- **Arrows / Space** — next / previous slide.
- **`O` or `Esc`** — toggle the **overview grid** (also available as the
  **⊞ Overview** button, top-right).
- **`F`** — fullscreen. **`S`** — speaker-notes view.
- The **3D building** (slide 5) auto-rotates; **drag** to orbit, hover to pause.
  It needs WebGL; where WebGL is unavailable (e.g. PDF export) a colored static
  SVG fallback is shown instead.

---

## Deploy to GitHub Pages

The deck is fully static with relative paths, so any of these work:

**Option A — project page from a subfolder (`/docs` or branch):**
1. Commit the `site/` directory to your repository.
2. In **Settings → Pages**, set the source to the branch and the folder that
   contains `index.html` (point Pages at this `site/` folder, e.g. by copying it
   to the repo root or `/docs`).
3. Pages serves it at `https://<user>.github.io/<repo>/`.

**Option B — dedicated `gh-pages` branch:**
```bash
# from the repo root, with the deck in documents/.../site
git subtree push --prefix documents/presentation_2026_NHERI_researchers_meeting/site origin gh-pages
```
Then set **Settings → Pages → Source = `gh-pages` / root**.

**Notes**
- No build step is required — it is plain HTML/CSS/JS.
- Do **not** add a `.nojekyll`-sensitive path; all asset folders here
  (`assets/`, `vendor/`) start with normal characters, so Jekyll serves them
  fine. (If you ever vendor a folder beginning with `_`, add an empty
  `.nojekyll` file at the Pages root.)
- The `tools/` folder (decktape + puppeteer) is only for PDF export and can be
  excluded from the deployed site.

---

## Regenerate the PDF

The committed PDF lives at
`../Wang-Haifeng_Geometry-Aware-CondNN-Wind-Pressure.pdf`. To rebuild it:

**Recommended — the bundled `print_pdf.mjs` script** (most robust; uses reveal's
native `?print-pdf` mode + a single Chromium `page.pdf()` call):

```bash
cd site

# 1. install the export toolchain once (puppeteer downloads a Chromium build)
npm --prefix tools install

# 2. serve the deck over HTTP, then export all slides to one PDF
python3 -m http.server 8000 &
node tools/print_pdf.mjs \
  "http://127.0.0.1:8000/index.html?print-pdf" \
  "../Wang-Haifeng_Geometry-Aware-CondNN-Wind-Pressure.pdf"
```

Produces a 20-page PDF (15 core + 5 appendix; one page per slide). The 3D building renders
via WebGL in a real GPU browser; in headless export (no GPU) the matching colored
SVG fallback is captured, so the geometry slide still shows the colored building.

**Alternative — decktape** (also bundled). Works, but its per-slide DevTools
evaluates can stall under memory pressure, so raise the timeouts:

```bash
node tools/node_modules/.bin/decktape reveal \
  "http://127.0.0.1:8000/index.html" \
  "../Wang-Haifeng_Geometry-Aware-CondNN-Wind-Pressure.pdf" \
  --size 1280x720 --chrome-arg=--no-sandbox --chrome-arg=--disable-dev-shm-usage \
  --url-load-timeout 120000 --page-load-timeout 120000 --buffer-timeout 8000
```

### If puppeteer/Chromium is unavailable
reveal.js must be *driven* to paginate, so a bare `chrome --headless
--print-to-pdf` on `index.html?print-pdf` yields a blank page — do not use it.
Instead open `index.html?print-pdf` in a desktop Chrome/Edge, wait for all slides
to stack vertically, then **File -> Print -> Save as PDF** with margins *None* and
background graphics *enabled*. reveal's print stylesheet produces one page per slide.

---

## Editing the deck
- **Content / slides:** edit `index.html` (each `<section>` is one slide).
- **Theme / colors / fonts:** edit `assets/css/theme.css` (CSS variables at the
  top hold the WSU palette).
- **3D building:** edit `assets/js/three-building.js` (parametric geometry +
  synthetic Cp colormap; see comments).
- After editing, re-run the PDF export step to refresh the artifact.
