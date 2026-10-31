import type { BodyNode } from './schema.ts';

export interface ContentTree {
  nodes: Map<string, BodyNode>;
  root: BodyNode;
}

/** Assumes nodes have already passed validateContent. */
export function buildTree(list: BodyNode[]): ContentTree {
  const nodes = new Map(list.map((n) => [n.id, n]));
  const root = list.find((n) => !n.parent);
  if (!root) throw new Error('content has no root node');
  return { nodes, root };
}

/** Root first, `id` last. */
export function ancestry(tree: ContentTree, id: string): BodyNode[] {
  const chain: BodyNode[] = [];
  let cur = tree.nodes.get(id);
  while (cur && !chain.includes(cur)) {
    chain.unshift(cur);
    cur = cur.parent ? tree.nodes.get(cur.parent) : undefined;
  }
  return chain;
}

/** Hash path for a node: "/" for the root, otherwise its ancestor ids, e.g. "/cardiovascular/blood". */
export function pathFor(tree: ContentTree, id: string): string {
  return '/' + ancestry(tree, id).slice(1).map((n) => n.id).join('/');
}

/**
 * Resolves a hash path. The last segment picks the node, so shortened links like
 * "/cardiovascular/blood/rbc" still work; `canonical` is the full path to redirect to.
 */
export function resolvePath(tree: ContentTree, path: string): { node: BodyNode | null; canonical: string } {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { node: tree.root, canonical: '/' };
  const node = tree.nodes.get(segments[segments.length - 1]) ?? null;
  return { node, canonical: node ? pathFor(tree, node.id) : '/' };
}
