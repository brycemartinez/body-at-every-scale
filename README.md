# Body at Every Scale

Zoom from the whole human body down to single molecules, with a short, sourced explanation at every stop. See [HANDOFF.md](HANDOFF.md) for the full product brief.

**Status:** Phases 1–2 done: the oxygen pathway (body → cardiovascular → blood → blood tissue → red blood cell → membrane & cytoskeleton → hemoglobin) with generated placeholder art.

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
- `visual.hotspots` can only target children; coordinates are fractions (0–1) of the square scene. Children without a hotspot are laid out automatically.
- A stat labelled `"Size"` is shown as the node's real size in the panel and on the scale ruler.
- `related` ids that don't exist yet only warn; their chips appear once the node is added.

To add a child: add its id to the parent's `children` (and optionally a hotspot), then create its JSON file.

## Links

Every node has a URL like `/#/cardiovascular/blood/blood-tissue/rbc`. Shortened links that end in a valid id (e.g. `/#/cardiovascular/blood/rbc`) redirect to the full path.

## Deploying

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and tests every push and PR, and deploys `main` to GitHub Pages. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. The build uses a relative base path, so it works at `user.github.io/<any-repo-name>/` without changes.

Educational only, not medical advice.
