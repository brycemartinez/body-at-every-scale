import type { BodyNode } from '../schema.ts';
import { ancestry, pathFor, type ContentTree } from '../tree.ts';
import { hrefFor } from '../router.ts';

const SHORT_TITLES: Record<string, string> = { body: 'Body' };

export function Breadcrumb({ tree, node }: { tree: ContentTree; node: BodyNode }) {
  const chain = ancestry(tree, node.id);
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        {chain.map((n, i) => {
          const label = SHORT_TITLES[n.id] ?? n.title.replace(/ system$/, '');
          const last = i === chain.length - 1;
          return (
            <li key={n.id}>
              {last ? (
                <span aria-current="page">{label}</span>
              ) : (
                <a href={hrefFor(pathFor(tree, n.id))}>{label}</a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
