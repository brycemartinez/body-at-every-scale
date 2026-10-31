import type { BodyNode, Hotspot } from '../schema.ts';

/**
 * Generated stand-in art until real illustrations exist. Each child is drawn as a group whose
 * `id` is the child's node id; Scene finds those groups by id and lays its hotspot buttons over
 * them, exactly as it will with hand-drawn SVGs.
 */

export const VIEWBOX = 1000;

interface Props {
  node: BodyNode;
  hotspots: Hotspot[];
  /** CSS colour for the current node's system, and for each child's. */
  hue: string;
  childHues: Record<string, string>;
}

/** Small deterministic PRNG so decoration is stable per node across renders. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function BodyFigure() {
  return (
    <g className="art-figure">
      <circle cx="500" cy="118" r="62" />
      <rect x="470" y="172" width="60" height="44" rx="18" />
      <rect x="362" y="208" width="276" height="350" rx="96" />
      <rect x="316" y="222" width="64" height="330" rx="32" transform="rotate(10 348 222)" />
      <rect x="620" y="222" width="64" height="330" rx="32" transform="rotate(-10 652 222)" />
      <rect x="392" y="520" width="98" height="420" rx="48" />
      <rect x="510" y="520" width="98" height="420" rx="48" />
    </g>
  );
}

function Decoration({ node, hue }: { node: BodyNode; hue: string }) {
  const rand = seeded(node.id);
  switch (node.level) {
    case 'body':
      return <BodyFigure />;
    case 'system':
      return (
        <g>
          <g className="art-figure art-figure--faint">
            <BodyFigure />
          </g>
          <g fill="none" stroke={hue} strokeWidth="10" strokeLinecap="round" opacity="0.55">
            <path d="M420 360 C 300 300, 300 520, 420 470" />
            <path d="M580 360 C 760 300, 760 820, 560 760 C 470 735, 470 600, 600 560" />
            <path d="M440 400 L 440 900 M560 400 L 560 900" opacity="0.6" />
          </g>
        </g>
      );
    case 'organ':
      return (
        <path
          d="M500 140 C 760 120, 900 360, 830 600 C 770 820, 520 900, 330 820 C 140 740, 110 470, 220 300 C 290 190, 390 145, 500 140 Z"
          fill={hue}
          opacity="0.14"
          stroke={hue}
          strokeOpacity="0.5"
          strokeWidth="6"
        />
      );
    case 'tissue':
      return (
        <g fill={hue}>
          {Array.from({ length: 46 }, (_, i) => (
            <ellipse
              key={i}
              cx={60 + rand() * 880}
              cy={60 + rand() * 880}
              rx={26 + rand() * 10}
              ry={18 + rand() * 8}
              transform={`rotate(${rand() * 180})`}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              opacity={0.12 + rand() * 0.14}
            />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <circle key={`w${i}`} cx={120 + rand() * 760} cy={120 + rand() * 760} r="42" fill="#c9b8ff" opacity="0.25" />
          ))}
        </g>
      );
    case 'cell':
      return (
        <g>
          <ellipse cx="500" cy="500" rx="380" ry="350" fill={hue} opacity="0.22" stroke={hue} strokeWidth="10" strokeOpacity="0.7" />
          <ellipse cx="500" cy="500" rx="210" ry="190" fill="#000" opacity="0.18" />
        </g>
      );
    case 'organelle':
      return (
        <g stroke={hue} strokeOpacity="0.35" strokeWidth="5" fill="none">
          <path d="M60 140 C 300 90, 700 90, 940 140" strokeWidth="18" strokeOpacity="0.5" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M${80 + i * 105} 170 l 50 90 l -50 90 l 50 90 l -50 90 l 50 90 l -50 90`} />
          ))}
        </g>
      );
    case 'molecule':
      return (
        <g fill={hue}>
          {Array.from({ length: 70 }, (_, i) => {
            const a = rand() * Math.PI * 2;
            const d = Math.sqrt(rand()) * 300;
            return <circle key={i} cx={500 + Math.cos(a) * d} cy={500 + Math.sin(a) * d} r={22 + rand() * 26} opacity={0.18 + rand() * 0.22} />;
          })}
        </g>
      );
  }
}

export function PlaceholderArt({ node, hotspots, hue, childHues }: Props) {
  const gid = (child: string) => `grad-${node.id}-${child}`;
  return (
    <svg className="scene-art" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} aria-hidden="true" focusable="false">
      <defs>
        {hotspots.map((h) => (
          <radialGradient key={h.target} id={gid(h.target)} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="35%" stopColor={childHues[h.target]} stopOpacity="0.9" />
            <stop offset="100%" stopColor={childHues[h.target]} stopOpacity="0.35" />
          </radialGradient>
        ))}
      </defs>
      <Decoration node={node} hue={hue} />
      {hotspots.map((h) => (
        <g key={h.target} id={h.target} data-shape={h.shape} className="art-child" style={{ color: childHues[h.target] }}>
          {h.shape === 'circle' ? (
            <>
              <circle cx={h.x * VIEWBOX} cy={h.y * VIEWBOX} r={h.r * VIEWBOX} fill={`url(#${gid(h.target)})`} stroke="currentColor" strokeWidth="5" />
            </>
          ) : (
            <rect
              x={h.x * VIEWBOX}
              y={h.y * VIEWBOX}
              width={h.w * VIEWBOX}
              height={h.h * VIEWBOX}
              rx="24"
              fill={`url(#${gid(h.target)})`}
              stroke="currentColor"
              strokeWidth="5"
            />
          )}
        </g>
      ))}
    </svg>
  );
}
