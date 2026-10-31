import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BodyNode, Hotspot } from '../schema.ts';
import type { ContentTree } from '../tree.ts';
import { hueFor } from '../theme.ts';
import { PlaceholderArt, VIEWBOX } from './PlaceholderArt.tsx';

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

export function Scene({ tree, node, onEnter, onBoxes }: Props) {
  const artRef = useRef<HTMLDivElement>(null);
  const hotspots = useMemo(() => hotspotsFor(node), [node]);
  const childHues = useMemo(() => Object.fromEntries(node.children.map((c) => [c, hueFor(tree, c)])), [tree, node]);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});

  // Wire hotspots by id: find each child's element in the art and place a button over its bounds.
  // Falls back to the JSON hotspot if the art has no element with that id.
  useLayoutEffect(() => {
    const svg = artRef.current?.querySelector('svg');
    const next: Record<string, Box> = {};
    for (const h of hotspots) {
      const el = svg?.querySelector<SVGGraphicsElement>(`[id="${CSS.escape(h.target)}"]`);
      if (el && typeof el.getBBox === 'function') {
        const b = el.getBBox();
        next[h.target] = {
          x: b.x / VIEWBOX,
          y: b.y / VIEWBOX,
          w: b.width / VIEWBOX,
          h: b.height / VIEWBOX,
          round: el.dataset.shape !== 'rect',
        };
      } else {
        next[h.target] = boxFromHotspot(h);
      }
    }
    setBoxes(next);
    onBoxes?.(next);
    // Re-measure only when the scene's hotspots change, not when the onBoxes callback identity does.
  }, [hotspots]);

  return (
    <div className="scene" data-level={node.level}>
      <div ref={artRef} className="scene-art-wrap">
        <PlaceholderArt node={node} hotspots={hotspots} hue={hueFor(tree, node.id)} childHues={childHues} />
      </div>
      <div className="hotspots">
        {node.children.map((id) => {
          const child = tree.nodes.get(id)!;
          const box = boxes[id];
          if (!box) return null;
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
