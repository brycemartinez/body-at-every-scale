# Handoff: Interactive Human Body Explorer

Oct 31, 2026 · Bryce Martinez

## Overview

Build a single-page, browser-based explorer where a visitor starts at a full human figure and zooms continuously through seven scales, from organ systems down to molecules, with a short, accurate explanation at every stop.

**Working name:** Body at Every Scale (placeholder; rename freely).

**Audience:** curious adults, pre-health and nursing students, EMT/paramedic trainees, and high-school biology classes. Reading level targets an educated non-specialist, with an optional "go deeper" layer for students.

**Core experience:** scroll or pinch to zoom into any highlighted region. Each zoom crosses one scale boundary (organ system → organ → tissue → cell → organelle → molecule). A side panel explains what you're looking at, how it connects to the level above, and why it matters clinically.

**What makes it different from a static atlas:** the connections between levels. Every node answers "how does this part make the level above it work?" Example: hemoglobin's oxygen binding → red blood cell → blood → cardiovascular system → why a pulse oximeter reads low.

**Success criteria for v1:**

- A visitor can reach the molecular level from the full body in 6 clicks or fewer, on any of the 3 launch pathways
- Every node has a summary of 120 words or fewer, a "how it connects" line, and at least 1 cited source
- Loads in under 3 seconds on a mid-range phone; works with keyboard and screen reader
- Deploys as a static site with no backend

## Zoom levels

The explorer has 7 fixed levels. Every node belongs to exactly one, and each zoom moves down one level. The cell level is the hinge between anatomy (above) and biochemistry (below), so its art and copy need the most care.

| Level | Real scale | What it shows | Oxygen-pathway example |
| --- | --- | --- | --- |
| 0 · Body | ~1.7 m | Whole figure; organ systems as toggleable overlays | Cardiovascular system lights up in red |
| 1 · Organ system | ~0.3–1.7 m | One system's organs and how they connect | Heart, arteries, veins, capillaries, blood |
| 2 · Organ | ~1–30 cm | Gross anatomy: chambers, layers, what flows in and out | The heart's four chambers and valves; blood as a fluid organ |
| 3 · Tissue | ~0.1–1 mm | Histology: which cells, arranged how | Blood smear: plasma, red cells, white cells, platelets |
| 4 · Cell | ~1–100 µm | One cell type: its shape, and how shape serves its job | Red blood cell, a ~7 µm biconcave disc with no nucleus |
| 5 · Organelle / structure | ~10 nm–10 µm | The cell's internal machinery | Membrane and spectrin cytoskeleton that let it squeeze through capillaries |
| 6 · Molecule | ~0.1–10 nm | Proteins, ions, and the reactions that do the work | Hemoglobin: 4 heme groups, each binding one O₂ |

Read top to bottom: each level's example is a child of the one above, so the oxygen pathway is one continuous zoom from the whole body to hemoglobin.

## Content map

Launch with 3 complete vertical pathways, one per major system, then fill the other 8 systems to the organ level only. Depth beats breadth for v1: a visitor who reaches hemoglobin once understands the product.

### Launch pathways (built to full depth)

| Pathway | System | Organ | Tissue | Cell | Organelle / structure | Molecule | Clinical hook |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Oxygen delivery | Cardiovascular | Heart → blood | Blood (connective tissue) | Red blood cell | Cytoskeleton / membrane (no nucleus) | Hemoglobin + O₂ | Pulse oximetry, carbon monoxide poisoning, sickle cell |
| Muscle contraction | Musculoskeletal | Skeletal muscle (biceps) | Skeletal muscle tissue | Muscle fiber | Sarcomere, sarcoplasmic reticulum | Actin, myosin, ATP, Ca²⁺ | Rigor mortis, rhabdomyolysis, hyperkalemia |
| Nerve signaling | Nervous | Brain → spinal cord | Nervous tissue | Neuron | Axon, myelin, synapse | Na⁺/K⁺ pump, voltage-gated channels, acetylcholine | Local anesthetics, multiple sclerosis, stroke |

### Organ-level coverage for the remaining systems (v1)

| System | Organs to include |
| --- | --- |
| Respiratory | Lungs, trachea, bronchi, alveoli (link into oxygen pathway) |
| Digestive | Stomach, small intestine, liver, pancreas |
| Urinary | Kidneys, nephron, bladder |
| Endocrine | Pituitary, thyroid, adrenals, pancreatic islets |
| Immune / lymphatic | Lymph nodes, spleen, thymus |
| Integumentary | Skin layers |
| Reproductive | Ovaries, uterus, testes |
| Skeletal | Long bone, joint |

### Node schema

Every stop in the explorer is one node. Content lives in JSON (or Markdown with front matter) so it can be edited without touching code.

```json
{
  "id": "rbc",
  "level": "cell",
  "title": "Red blood cell",
  "parent": "blood",
  "children": ["rbc-membrane", "hemoglobin"],
  "summary": "≤120 words, plain language",
  "connectsUp": "How this makes the parent work, one sentence",
  "deeper": "Optional student-level detail, ≤250 words",
  "clinical": "One real-world or EMS-relevant hook",
  "stats": [{ "label": "Lifespan", "value": "~120 days" }],
  "related": ["alveolus", "spleen"],
  "visual": { "asset": "rbc.svg", "hotspots": [{ "target": "hemoglobin", "shape": "circle", "x": 0.5, "y": 0.5, "r": 0.1 }] },
  "sources": [{ "title": "OpenStax Anatomy & Physiology 2e, ch. 18", "url": "https://openstax.org/books/anatomy-and-physiology-2e" }]
}
```

`related` creates cross-links between pathways (the alveolus links respiratory into the oxygen pathway), which turns the tree into a web.

## UX and interaction

The viewport is the product: about 70% of the screen is the zoomable scene, about 30% is the info panel. On mobile, the panel becomes a bottom sheet the visitor can drag up.

**Zoom behavior**

- Click or tap a hotspot to fly into it: a 600–900 ms eased zoom that scales the current scene toward the hotspot, then crossfades to the child scene. This sells the feeling of continuous depth.
- Scroll wheel, pinch, and +/− buttons zoom within a scene. Past a threshold over a hotspot, it auto-crosses into the child level.
- Back (button, Esc, browser back, or pinch-out past the threshold) returns one level.
- Honor `prefers-reduced-motion`: replace the fly-through with an instant cut plus a short fade.

**Orientation aids**

- **Scale ruler** fixed on the left edge showing all 7 levels, current level lit, with a real-world size ("~7 µm" for a red blood cell). Clicking a level jumps to it along the current path.
- **Breadcrumb** across the top: Body › Cardiovascular › Blood › Red blood cell › Hemoglobin.
- **Minimap** of the full body in a corner with the current region outlined.

**Info panel (per node)**

1. Title, level badge, real size
2. Summary (default view)
3. "How it connects" line linking to the parent
4. Expandable "Go deeper" and "Clinical connection" sections
5. Key stats (2–4)
6. Related nodes as chips (cross-pathway jumps)
7. Sources

**Discovery**

- Search box (Cmd/Ctrl+K) across all node titles and aliases; results show their full path.
- Optional guided tours: "Follow a breath of oxygen" walks a visitor through the pathway with Next/Previous.
- Every node has a shareable URL (`/#/cardiovascular/blood/rbc/hemoglobin`) so a teacher can link straight to it.

**Accessibility**

- All hotspots are focusable buttons in a logical tab order, with visible focus rings and text labels.
- Every scene has a text alternative: the info panel plus a list of its children is a full non-visual way through the content.
- Contrast at WCAG 2.2 AA; no information carried by colour alone; touch targets at least 44 px.

## Visual design direction

Aim for a calm, scientific-illustration look, like a modern textbook plate rather than a video game. Use a dark canvas so the colour-coded structures glow, with light text panels.

- **Art style:** flat vector SVG with soft gradients inside shapes, consistent line weight, no photoreal gore. One illustration style across all 7 levels so the zoom feels continuous.
- **Colour coding by system:** each system gets one hue that persists as you zoom in, so a red blood cell stays in the cardiovascular red family. Suggested: cardiovascular red, respiratory sky blue, nervous yellow, musculoskeletal coral, digestive amber, urinary teal, endocrine violet, immune green.
- **Level cue:** the background subtly shifts with scale. Warm skin tone at body level, tissue-pink at tissue level, a cytoplasm-like deep blue at cell level, a near-black "molecular space" with soft particle drift at molecule level.
- **Typography:** a humanist sans (Inter or Source Sans 3) for UI; a serif (Source Serif 4) for the summary text to feel editorial. Body copy at 16–18 px.
- **Body figure:** gender-neutral, front-facing outline; offer a front/back toggle in a later phase.
- **Molecules:** simplified ribbon or space-filling renders as pre-made SVG or PNG; v2 can swap in a live 3D viewer (Mol* or 3Dmol.js) loading real PDB entries such as 1A3N for hemoglobin.
- **Asset sourcing:** commission or generate original SVGs; where you borrow, use openly licensed sources (Servier Medical Art is CC BY 4.0; Wikimedia Commons per-file licences) and credit them in a Credits page.

## Technical architecture

Build it as a static single-page app: 2D SVG scenes with "semantic zoom" (each level is its own scene, linked by animated transitions). Skip full 3D for v1. A 3D body model costs far more in assets and performance and doesn't help at the cell and molecule levels.

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Vite + React + TypeScript | Fast dev server, typed node schema, easy static build |
| Zoom and pan | d3-zoom (or react-zoom-pan-pinch) on an SVG viewport | Handles wheel, pinch, and drag with inertia |
| Transitions | Framer Motion | Fly-into-hotspot animation and crossfades; respects reduced motion |
| Routing | Hash router (`/#/path/to/node`) | Deep links work on GitHub Pages with no server config |
| Content | JSON files in `/content`, validated with Zod at build time | Non-coders can edit; bad content fails the build, not the user |
| Search | Fuse.js over a build-time index | Fuzzy client-side search, no backend |
| Styling | CSS modules or Tailwind, with CSS variables for system colours | Theme tokens in one place |
| Molecules (v2) | Mol* or 3Dmol.js, lazy-loaded | Real PDB structures only when a visitor reaches that level |
| Hosting | GitHub Pages via GitHub Actions | Free, matches your existing site setup |
| Testing | Vitest for content and logic; Playwright for the zoom flows; axe-core for accessibility | Catches broken paths and regressions |

**Proposed file structure**

```
body-explorer/
├─ content/
│  ├─ body.json
│  ├─ cardiovascular/
│  │  ├─ cardiovascular.json
│  │  ├─ heart.json
│  │  ├─ blood.json
│  │  ├─ rbc.json
│  │  └─ hemoglobin.json
│  ├─ musculoskeletal/…
│  └─ nervous/…
├─ public/art/            # one SVG per node, hotspot IDs match child node IDs
├─ src/
│  ├─ schema.ts            # Zod schema for a node
│  ├─ content-loader.ts    # builds the tree + search index
│  ├─ components/
│  │  ├─ Viewport.tsx       # zoom/pan + scene rendering
│  │  ├─ Scene.tsx          # one level's SVG + hotspots
│  │  ├─ InfoPanel.tsx
│  │  ├─ ScaleRuler.tsx
│  │  ├─ Breadcrumb.tsx
│  │  ├─ Minimap.tsx
│  │  └─ SearchDialog.tsx
│  └─ App.tsx
├─ tests/
└─ .github/workflows/deploy.yml
```

**Key implementation notes**

- Hotspots: in each SVG, give clickable regions an `id` equal to the child node's `id`. The Scene component wires them up automatically, so adding a child means adding an SVG group plus a JSON file.
- Placeholder art: until real illustrations exist, render each scene as labelled shapes generated from the JSON so the whole pathway is navigable on day one.
- Performance: lazy-load each scene's SVG; prefetch children of the current node; keep each SVG under 150 KB.

## Build plan

Ship in 5 phases. Each phase ends with something deployable, and the next starts only when its acceptance checks pass.

1. **Skeleton.** Vite + React + TS scaffold, Zod schema, content loader, hash routing, GitHub Pages deploy.
   - Done when: the site deploys; visiting `/#/cardiovascular/blood/rbc` shows the right title and breadcrumb; an invalid JSON node fails the build.
2. **One pathway, placeholder art.** Viewport, Scene with auto-wired hotspots, InfoPanel, Breadcrumb, ScaleRuler. The oxygen pathway is fully written, with generated placeholder shapes.
   - Done when: body → hemoglobin is reachable in 6 clicks or fewer, by mouse, touch, and keyboard; back works at every level; reduced-motion mode cuts instead of flying.
3. **All 3 pathways + organ coverage.** Muscle and nerve pathways written; the other 8 systems to organ level; `related` cross-links; search.
   - Done when: every node passes the content checklist (summary ≤120 words, connects-up line, ≥1 source); search finds any node by title or alias in under 100 ms.
4. **Real art and polish.** Final SVG illustrations, system colour tokens, level backgrounds, minimap, mobile bottom sheet.
   - Done when: Lighthouse performance ≥90 and accessibility ≥95 on mobile; axe-core reports zero serious violations; works on iOS Safari, Android Chrome, desktop Chrome, Firefox, and Safari.
5. **Depth features (v2).** Guided tours, live 3D molecules via Mol*, "Go deeper" student layer, front/back body toggle, optional quiz per pathway.
   - Done when: at least 1 guided tour is complete end to end, and 3D molecules lazy-load without slowing the first page load.

## Accuracy, sources, and open questions

**Content accuracy rules**

- Every factual claim traces to a source in the node's `sources` array. Preferred sources: [OpenStax Anatomy & Physiology 2e](https://openstax.org/books/anatomy-and-physiology-2e) and [OpenStax Biology 2e](https://openstax.org/books/biology-2e) (both CC BY), NCBI Bookshelf / StatPearls, and [RCSB PDB](https://www.rcsb.org/) for molecular structures.
- Numbers (sizes, counts, lifespans) are given as approximations with units, and include "~" where values vary between people.
- Educational only: a footer disclaimer says the site is not medical advice.
- Have a second person review each pathway before launch (a classmate, instructor, or clinician).

**Open questions**

- [ ] Final name and domain: a subpath of the personal site or a standalone repo?
- [ ] Primary audience for v1: general public or pre-health/EMS students? This sets the default reading level.
- [ ] Art: hand-made SVGs, commissioned illustrator, or AI-assisted then hand-cleaned?
- [ ] Include an EMS / clinical lens as a toggle layer, or keep clinical hooks inline?
- [ ] Spanish-language version: plan the content schema for i18n now (`summary.en`, `summary.es`) or later?

**Kickoff prompt for Claude Code**

Paste this into Claude Code in an empty folder to start Phase 1 and 2:

```
Read HANDOFF.md (this document, exported as Markdown) in this folder. Build Phases 1 and 2 of the Interactive Human Body Explorer:

1. Scaffold Vite + React + TypeScript. Add d3-zoom (or react-zoom-pan-pinch), Framer Motion, Zod, Fuse.js, Vitest, Playwright.
2. Implement the node schema in src/schema.ts exactly as in the handoff, and a content loader that builds a tree from /content and fails the build on invalid nodes.
3. Write the full oxygen-delivery pathway as JSON: body → cardiovascular → heart and blood → red blood cell → membrane/cytoskeleton → hemoglobin. Use OpenStax A&P 2e as the source and cite chapters.
4. Build Viewport, Scene, InfoPanel, Breadcrumb, and ScaleRuler. Generate placeholder SVG scenes from the JSON (labelled shapes, hotspots wired by id) so the pathway is navigable before real art exists.
5. Hash routing for deep links, keyboard navigation for every hotspot, prefers-reduced-motion support.
6. GitHub Actions workflow deploying to GitHub Pages.
7. Tests: a Vitest check that every node meets the content checklist, and a Playwright test that clicks from body to hemoglobin and back.

Stop after Phase 2 and summarise what's done, what's stubbed, and anything in the handoff you deviated from.
```
