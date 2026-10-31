# Body at Every Scale

Zoom from the whole human body down to single molecules, with a short, sourced explanation at every stop. See [HANDOFF.md](HANDOFF.md) for the full product brief.

**Status:** Phases 1–2 done: the oxygen pathway (body → cardiovascular → blood → blood tissue → red blood cell → membrane & cytoskeleton → hemoglobin) with scientific-illustration SVGs at real proportions.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + validate content + build to dist/
npm test             # Vitest: content checklist, validation rules, routing
npm run test:e2e     # Playwright: click/tap/keyboard/back/reduced-motion/axe on the production build
```

The first `test:e2e` run needs a browser: `npx playwright install chromium`.

## Editing content

Each stop is one JSON file in [`content/`](content), named after its `id` (e.g. `content/cardiovascular/rbc.json`). The schema lives in [`src/schema.ts`](src/schema.ts). The build fails with a readable message if a node breaks a rule:

- `summary` ≤ 120 words, `deeper` ≤ 250 words, `connectsUp` required, at least 1 entry in `sources`, at most 4 `stats`
- `parent` and `children` must agree in both files, and a child must sit **exactly one level** below its parent (`body → system → organ → tissue → cell → organelle → molecule`)
- `visual.hotspots` can only target children; coordinates are fractions (0–1) of the square scene. They're a fallback: when the node has art, the button is placed over the art's own element for that child (see below).
- A stat labelled `"Size"` is shown as the node's real size in the panel and on the scale ruler.
- `related` ids that don't exist yet only warn; their chips appear once the node is added.

To add a child: add its id to the parent's `children`, add a group with that id to the parent's SVG, then create the child's JSON file.

## Art

Each node's drawing is `public/art/<asset>.svg`, named in `visual.asset`. The build checks that every asset:

- exists, is under 150 KB, and uses `viewBox="0 0 1000 1000"`
- contains an element with `id="<child id>"` for every child. The hotspot button is placed over that element, or over an element inside it marked `data-hotspot-area` when only part of the group should be clickable (e.g. the whole arterial tree is the `cardiovascular` group, but only the circle around the heart is the button).

Prefix gradient and clip-path ids with something unique to the file (e.g. `rb-disc`), because two scenes are on the page together during a zoom. Nodes without `visual.asset` get generated placeholder shapes.

The current drawings are original and drawn to real proportions: the red blood cell's side view follows the Evans & Fung (1972) shape equation, the blood smear uses true relative cell sizes with a 10 µm scale bar, and the membrane scene is drawn at 10 px per nanometre.

## Links

Every node has a URL like `/#/cardiovascular/blood/blood-tissue/rbc`. Shortened links that end in a valid id (e.g. `/#/cardiovascular/blood/rbc`) redirect to the full path.

## Deploying

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and tests every push and PR, and deploys `main` to GitHub Pages. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. The build uses a relative base path, so it works at `user.github.io/<any-repo-name>/` without changes.

Educational only, not medical advice.
