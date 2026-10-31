import { LEVELS, LEVEL_INFO, levelIndex, sizeOf } from '../levels.ts';
import type { BodyNode } from '../schema.ts';
import { ancestry, pathFor, type ContentTree } from '../tree.ts';
import { hrefFor } from '../router.ts';

/** All 7 levels, current one lit. Levels above are links back up the current path. */
export function ScaleRuler({ tree, node }: { tree: ContentTree; node: BodyNode }) {
  const chain = ancestry(tree, node.id);
  const current = levelIndex(node.level);
  return (
    <nav className="ruler" aria-label="Scale">
      <ol>
        {LEVELS.map((level, i) => {
          const info = LEVEL_INFO[level];
          const stop = chain.find((n) => n.level === level);
          const state = i === current ? 'current' : i < current ? 'above' : 'below';
          const size = i === current ? (sizeOf(node) ?? info.scale) : info.scale;
          const body = (
            <>
              <span className="ruler-tick" aria-hidden="true" />
              <span className="ruler-text">
                <span className="ruler-level">{info.label}</span>
                <span className="ruler-scale">{size}</span>
              </span>
            </>
          );
          return (
            <li key={level} className={`ruler-item ruler-item--${state}`}>
              {state === 'above' && stop ? (
                <a href={hrefFor(pathFor(tree, stop.id))} title={`Jump to ${stop.title}`}>
                  {body}
                  <span className="visually-hidden">: jump to {stop.title}</span>
                </a>
              ) : (
                <span aria-current={state === 'current' ? 'step' : undefined}>
                  {body}
                  {state === 'current' && <span className="visually-hidden"> (current level)</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
