import { LEVEL_INFO, sizeOf } from '../levels.ts';
import type { BodyNode } from '../schema.ts';
import { pathFor, type ContentTree } from '../tree.ts';
import { hrefFor } from '../router.ts';

interface Props {
  tree: ContentTree;
  node: BodyNode;
}

export function InfoPanel({ tree, node }: Props) {
  const parent = node.parent ? tree.nodes.get(node.parent) : undefined;
  const children = node.children.map((id) => tree.nodes.get(id)!);
  const related = node.related.map((id) => tree.nodes.get(id)).filter((n): n is BodyNode => !!n);
  const size = sizeOf(node);
  const stats = node.stats.filter((s) => s.label.toLowerCase() !== 'size');

  return (
    <aside className="panel" aria-labelledby="panel-title">
      <header className="panel-head">
        <p className="panel-meta">
          <span className="badge">{LEVEL_INFO[node.level].label}</span>
          {size && <span className="panel-size">{size}</span>}
        </p>
        <h1 id="panel-title" tabIndex={-1}>
          {node.title}
        </h1>
      </header>

      <p className="summary">{node.summary}</p>

      <p className="connects">
        <span className="connects-label">How it connects</span>
        {parent ? (
          <>
            {' '}
            to <a href={hrefFor(pathFor(tree, parent.id))}>{parent.title}</a>:{' '}
          </>
        ) : (
          ': '
        )}
        {node.connectsUp}
      </p>

      {children.length > 0 && (
        <section className="panel-section">
          <h2>In this view</h2>
          <ul className="child-list">
            {children.map((c) => (
              <li key={c.id}>
                <a href={hrefFor(pathFor(tree, c.id))}>
                  {c.title} <span className="child-level">· {LEVEL_INFO[c.level].label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {node.deeper && (
        <details className="panel-details">
          <summary>Go deeper</summary>
          <p>{node.deeper}</p>
        </details>
      )}
      {node.clinical && (
        <details className="panel-details">
          <summary>Clinical connection</summary>
          <p>{node.clinical}</p>
        </details>
      )}

      {stats.length > 0 && (
        <section className="panel-section">
          <h2>Key stats</h2>
          <dl className="stats">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {related.length > 0 && (
        <section className="panel-section">
          <h2>Related</h2>
          <ul className="chips">
            {related.map((r) => (
              <li key={r.id}>
                <a className="chip" href={hrefFor(pathFor(tree, r.id))}>
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel-section">
        <h2>Sources</h2>
        <ol className="sources">
          {node.sources.map((s) => (
            <li key={s.url + s.title}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </section>

      <footer className="disclaimer">Educational only, not medical advice. Values are typical adult approximations.</footer>
    </aside>
  );
}
