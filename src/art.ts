// Scene illustrations live in public/art/ as plain SVG files (one per node, named in `visual.asset`).
// They're fetched on demand and cached, and a scene's children are prefetched so the next zoom is instant.

const pending = new Map<string, Promise<string>>();
const loaded = new Map<string, string>();

const urlFor = (asset: string) => `${import.meta.env.BASE_URL}art/${asset}`;

export function loadArt(asset: string): Promise<string> {
  let p = pending.get(asset);
  if (!p) {
    p = fetch(urlFor(asset))
      .then((res) => {
        if (!res.ok) throw new Error(`art ${asset}: HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        // The panel carries the meaning; the drawing itself is decorative to screen readers.
        const svg = text.replace(/<svg\b/, '<svg aria-hidden="true" focusable="false"');
        loaded.set(asset, svg);
        return svg;
      });
    p.catch(() => pending.delete(asset)); // allow a retry next time
    pending.set(asset, p);
  }
  return p;
}

/** The SVG text if it has already loaded, so a cached scene renders on the first frame. */
export const peekArt = (asset: string) => loaded.get(asset) ?? null;
