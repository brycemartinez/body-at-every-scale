import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from 'd3-zoom';
import { AnimatePresence, animate, m, useIsPresent, useReducedMotion, type Variants } from 'framer-motion';
import type { BodyNode } from '../schema.ts';
import type { ContentTree } from '../tree.ts';
import { Scene, type Box } from './Scene.tsx';

export type Direction = 'in' | 'out';

interface Props {
  tree: ContentTree;
  node: BodyNode;
  parent: BodyNode | null;
  direction: Direction;
  onNavigate: (id: string) => void;
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

const IDENTITY: Transform = { x: 0, y: 0, k: 1 };
const MIN_K = 0.6;
const MAX_K = 5;
/** Zooming past this over a hotspot crosses into that child. */
const CROSS_IN_K = 3.2;
/** Zooming out past this returns to the parent. */
const CROSS_OUT_K = 0.65;
const FLY_SECONDS = 0.75;
const FLY_EASE = [0.45, 0, 0.2, 1] as const;

const layerVariants: Variants = {
  enter: (dir: Direction) => ({ opacity: 0, scale: dir === 'in' ? 0.8 : 1.6 }),
  center: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: (dir: Direction) => ({
    opacity: 0,
    scale: dir === 'in' ? 1.4 : 0.6,
    transition: { duration: 0.35, ease: 'easeIn' },
  }),
};
const reducedVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/** Pointer position of a zoom gesture, in container pixels. */
function gesturePoint(src: Event | null, rect: DOMRect): { x: number; y: number } | null {
  if (!src) return null;
  if ('clientX' in src) {
    const e = src as MouseEvent;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  if ('touches' in src) {
    const e = src as TouchEvent;
    const list = e.touches.length ? e.touches : e.changedTouches;
    if (!list.length) return null;
    let x = 0;
    let y = 0;
    for (const t of Array.from(list)) {
      x += t.clientX;
      y += t.clientY;
    }
    return { x: x / list.length - rect.left, y: y / list.length - rect.top };
  }
  return null;
}

/** One scene in the crossfade. The outgoing copy is inert so its hotspots can't be focused or clicked. */
function SceneLayer({ direction, reduceMotion, children }: { direction: Direction; reduceMotion: boolean; children: ReactNode }) {
  const isPresent = useIsPresent();
  return (
    <m.div
      className="scene-layer"
      custom={direction}
      variants={reduceMotion ? reducedVariants : layerVariants}
      initial="enter"
      animate="center"
      exit="exit"
      inert={!isPresent}
    >
      {children}
    </m.div>
  );
}

export function Viewport({ tree, node, parent, direction, onNavigate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The transform is tagged with the node it belongs to, so a new scene never inherits the old one's.
  const [view, setView] = useState<{ id: string; t: Transform }>({ id: node.id, t: IDENTITY });
  const reduceMotion = useReducedMotion() ?? false;

  const flying = useRef(false);
  const crossing = useRef(false);
  const boxesRef = useRef<Record<string, Box>>({});

  // Latest values for the d3 handlers, which are bound once.
  const latest = useRef({ node, parent, onNavigate, size, view });
  latest.current = { node, parent, onNavigate, size, view };

  const stage = (w: number, h: number) => {
    const s = Math.max(0, Math.min(w, h) * 0.9);
    return { s, ox: (w - s) / 2, oy: (h - s) / 2 };
  };

  const cross = useCallback((id: string) => {
    if (crossing.current) return;
    crossing.current = true;
    latest.current.onNavigate(id);
  }, []);

  /** After a zoom step, cross a level if the gesture went past a threshold. */
  const checkCross = useCallback(
    (t: Transform, point: { x: number; y: number } | null) => {
      const { node, parent, size } = latest.current;
      if (crossing.current || flying.current) return;
      if (t.k <= CROSS_OUT_K && parent) {
        cross(parent.id);
        return;
      }
      if (t.k < CROSS_IN_K) return;
      const { s, ox, oy } = stage(size.w, size.h);
      const p = point ?? { x: size.w / 2, y: size.h / 2 };
      const nx = ((p.x - t.x) / t.k - ox) / s;
      const ny = ((p.y - t.y) / t.k - oy) / s;
      const hit = node.children.find((id) => {
        const b = boxesRef.current[id];
        return b && nx >= b.x && nx <= b.x + b.w && ny >= b.y && ny <= b.y + b.h;
      });
      if (hit) cross(hit);
    },
    [cross],
  );

  useLayoutEffect(() => {
    const el = containerRef.current!;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current!;
    const sel = select(el);
    const z = zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_K, MAX_K])
      .filter((event: Event & { button?: number; ctrlKey?: boolean }) => {
        if (flying.current) return false;
        return (!event.ctrlKey || event.type === 'wheel') && !event.button;
      })
      .on('zoom', (event) => {
        const t: Transform = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
        setView({ id: latest.current.node.id, t });
        if (event.sourceEvent) checkCross(t, gesturePoint(event.sourceEvent, el.getBoundingClientRect()));
      });
    sel.call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
    return () => {
      sel.on('.zoom', null);
    };
  }, [checkCross]);

  // Each new scene starts un-zoomed.
  useEffect(() => {
    crossing.current = false;
    flying.current = false;
    if (containerRef.current && zoomRef.current) {
      select(containerRef.current).call(zoomRef.current.transform, zoomIdentity);
    }
  }, [node.id]);

  const flyTo = useCallback(
    (childId: string, box: Box) => {
      if (flying.current || crossing.current) return;
      if (reduceMotion) {
        cross(childId);
        return;
      }
      flying.current = true;
      const { size, view } = latest.current;
      const { s, ox, oy } = stage(size.w, size.h);
      const t0 = view.id === node.id ? view.t : IDENTITY;
      // Hotspot centre in un-zoomed container pixels, and where it starts on screen.
      const hc = { x: ox + (box.x + box.w / 2) * s, y: oy + (box.y + box.h / 2) * s };
      const s0 = { x: t0.x + t0.k * hc.x, y: t0.y + t0.k * hc.y };
      const target = { x: size.w / 2, y: size.h / 2 };
      const k1 = Math.min(8, 0.95 / Math.max(box.w, box.h, 0.01));
      animate(0, 1, {
        duration: FLY_SECONDS,
        ease: FLY_EASE,
        onUpdate: (p) => {
          // Scale geometrically and slide the hotspot linearly to centre, so the zoom feels even.
          const k = t0.k * Math.pow(k1 / t0.k, p);
          const sx = s0.x + (target.x - s0.x) * p;
          const sy = s0.y + (target.y - s0.y) * p;
          setView({ id: node.id, t: { k, x: sx - k * hc.x, y: sy - k * hc.y } });
        },
        onComplete: () => cross(childId),
      });
    },
    [cross, node.id, reduceMotion],
  );

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    const z = zoomRef.current;
    if (!el || !z || flying.current) return;
    select(el).call(z.scaleBy, factor);
    const { x, y, k } = zoomTransform(el);
    checkCross({ x, y, k }, null);
  };
  const resetZoom = () => {
    if (containerRef.current && zoomRef.current && !flying.current) {
      select(containerRef.current).call(zoomRef.current.transform, zoomIdentity);
    }
  };

  const t = view.id === node.id ? view.t : IDENTITY;
  const { s, ox, oy } = stage(size.w, size.h);
  const isLeaf = node.children.length === 0;

  return (
    <div className="viewport" data-level={node.level}>
      <div
        ref={containerRef}
        className="viewport-canvas"
        id="scene"
        tabIndex={-1}
        role="region"
        aria-label={`Scene: ${node.title}`}
        aria-describedby="scene-hint"
      >
        <AnimatePresence initial={false} custom={direction}>
          <SceneLayer key={node.id} direction={direction} reduceMotion={reduceMotion}>
            <div className="scene-transform" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>
              <div className="scene-stage" style={{ left: ox, top: oy, width: s, height: s }}>
                <Scene
                  tree={tree}
                  node={node}
                  onEnter={flyTo}
                  onBoxes={(b) => {
                    boxesRef.current = b;
                  }}
                />
              </div>
            </div>
          </SceneLayer>
        </AnimatePresence>
      </div>

      <p id="scene-hint" className="viewport-hint">
        {isLeaf
          ? node.level === 'molecule'
            ? 'You’ve reached the molecular level, the bottom of this pathway.'
            : 'Deeper levels for this part arrive in a later phase.'
          : 'Select a highlighted part, or scroll / pinch over it, to zoom in.'}
      </p>

      <div className="viewport-controls" role="group" aria-label="Zoom controls">
        <button type="button" className="ctl" onClick={() => zoomBy(1.5)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="ctl" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="ctl" onClick={resetZoom} aria-label="Reset zoom">
          ⟲
        </button>
      </div>

      {parent && (
        <button type="button" className="back-btn" onClick={() => onNavigate(parent.id)} data-testid="back">
          <span aria-hidden="true">←</span> Back to {parent.title}
        </button>
      )}
    </div>
  );
}
