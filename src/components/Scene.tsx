import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BodyNode, Hotspot } from '../schema.ts';
import type { ContentTree } from '../tree.ts';
import { hueFor } from '../theme.ts';
import { loadArt, peekArt } from '../art.ts';
import { PlaceholderArt } from './PlaceholderArt.tsx';

/** A hotspot's bounding box as fractions of the scene (top-left origin). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  round: boolean;
}

interface Props {
  tree: ContentTree;
  node: BodyNode;
  onEnter: (childId: string, box: Box) => void;
  /** Called with the measured boxes so the Viewport can hit-test zoom gestures. */
  onBoxes?: (boxes: Record<string, Box>) => void;
}

/** Children without a hotspot in the JSON are spaced evenly around the centre. */
function hotspotsFor(node: BodyNode): Hotspot[] {
  const given = new Map(node.visual.hotspots.map((h) => [h.target, h]));
  const missing = node.children.filter((c) => !given.has(c));
  return node.children.map((id) => {
    const h = given.get(id);
    if (h) return h;
    const i = missing.indexOf(id);
    const a = (i / missing.length) * Math.PI * 2 - Math.PI / 2;
    const d = missing.length === 1 ? 0 : 0.28;
    return { target: id, shape: 'circle', x: 0.5 + Math.cos(a) * d, y: 0.5 + Math.sin(a) * d, r: 0.09 };
  });
}

const boxFromHotspot = (h: Hotspot): Box =>
  h.shape === 'circle'
    ? { x: h.x - h.r, y: h.y - h.r, w: h.r * 2, h: h.r * 2, round: true }
    : { x: h.x, y: h.y, w: h.w, h: h.h, round: false };

/**
 * Bounds of the element with id `target`, as fractions of the drawing. A `[data-hotspot-area]`
 * inside it, if present, sets the clickable bounds instead (e.g. a whole vessel tree whose
 * hotspot should only be the heart). Measured on screen, so transforms inside the SVG are honored.
 */
function measure(svg: SVGSVGElement, target: string): Box | null {
  const group = svg.querySelector<SVGGraphicsElement>(`[id="${CSS.escape(target)}"]`);
  if (!group) return null;
  const el = group.querySelector<SVGGraphicsElement>('[data-hotspot-area]') ?? group;
  const frame = svg.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (!frame.width || !frame.height) return null;
  return {
    x: (r.left - frame.left) / frame.width,
    y: (r.top - frame.top) / frame.height,
    w: r.width / frame.width,
    h: r.height / frame.height,
    round: el instanceof SVGCircleElement || el instanceof SVGEllipseElement || group.dataset.shape === 'circle',
  };
}

export function Scene({ tree, node, onEnter, onBoxes }: Props) {
  const artRef = useRef<HTMLDivElement>(null);
  const hotspots = useMemo(() => hotspotsFor(node), [node]);
  const childHues = useMemo(() => Object.fromEntries(node.children.map((c) => [c, hueFor(tree, c)])), [tree, node]);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});

  const asset = node.visual.asset;
  const [art, setArt] = useState<{ svg: string | null; failed: boolean }>(() => ({
    svg: asset ? peekArt(asset) : null,
    failed: false,
  }));
  useEffect(() => {
    if (!asset || art.svg) return;
    let live = true;
    loadArt(asset).then(
      (svg) => live && setArt({ svg, failed: false }),
      () => live && setArt({ svg: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [asset, art.svg]);

  // Prefetch the children's art so zooming in doesn't wait on the network.
  useEffect(() => {
    for (const id of node.children) {
      const childAsset = tree.nodes.get(id)?.visual.asset;
      if (childAsset) loadArt(childAsset).catch(() => {});
    }
  }, [tree, node]);

  const usePlaceholder = !asset || art.failed;
  const ready = usePlaceholder || !!art.svg;

  // Wire hotspots by id: find each child's element in the art and place a button over its bounds.
  // Falls back to the JSON hotspot if the art has no element with that id. Re-measures when the
  // drawing is resized, since on first load the stage can still be 0×0 when the art mounts.
  useLayoutEffect(() => {
    const wrap = artRef.current;
    if (!ready || !wrap) return;
    const update = () => {
      const svg = wrap.querySelector('svg');
      const next: Record<string, Box> = {};
      for (const h of hotspots) next[h.target] = (svg && measure(svg, h.target)) || boxFromHotspot(h);
      setBoxes(next);
      onBoxes?.(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
    // Re-measure only when the drawing changes, not when the onBoxes callback identity does.
  }, [hotspots, ready, art.svg]);

  return (
    <div className="scene" data-level={node.level}>
      {usePlaceholder ? (
        <div ref={artRef} className="scene-art-wrap">
          <PlaceholderArt node={node} hotspots={hotspots} hue={hueFor(tree, node.id)} childHues={childHues} />
        </div>
      ) : (
        // First-party SVG from public/art, validated at build time.
        <div ref={artRef} className="scene-art-wrap" dangerouslySetInnerHTML={art.svg ? { __html: art.svg } : undefined} />
      )}
      <div className="hotspots">
        {node.children.map((id) => {
          const child = tree.nodes.get(id)!;
          const box = boxes[id];
          if (!box || !ready) return null;
          return (
            <button
              key={id}
              type="button"
              className={[
                'hotspot',
                box.round && 'hotspot--round',
                // Keep labels near the scene's edges from running off it.
                box.x + box.w / 2 > 0.66 && 'hotspot--label-end',
                box.x + box.w / 2 < 0.34 && 'hotspot--label-start',
              ]
                .filter(Boolean)
                .join(' ')}
              data-testid={`hotspot-${id}`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
                ['--hue' as string]: childHues[id],
              }}
              aria-label={`Zoom into ${child.title}`}
              onClick={() => onEnter(id, box)}
            >
              <span className="hotspot-label" aria-hidden="true">
                {child.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
