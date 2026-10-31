import { nodeSchema, type BodyNode } from './schema.ts';
import { levelIndex } from './levels.ts';
import { buildTree, type ContentTree } from './tree.ts';

export interface RawFile {
  /** Path relative to the content folder, e.g. "cardiovascular/rbc.json". */
  file: string;
  data: unknown;
}

export interface ValidationResult {
  tree: ContentTree | null;
  errors: string[];
  /** Non-fatal: `related` links to nodes planned for a later phase. */
  warnings: string[];
}

/**
 * Parses every file against the schema, then checks the tree is consistent:
 * unique ids that match file names, one "body" root, parent/children agree both ways,
 * each child sits exactly one level below its parent, and hotspots only point at children.
 */
export function validateContent(files: RawFile[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodes = new Map<string, BodyNode>();

  for (const { file, data } of files) {
    const parsed = nodeSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${file}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      continue;
    }
    const node = parsed.data;
    const base = file.split('/').pop()?.replace(/\.json$/, '');
    if (base !== node.id) errors.push(`${file}: file name must match id (expected ${node.id}.json)`);
    if (nodes.has(node.id)) {
      errors.push(`${file}: duplicate id "${node.id}"`);
      continue;
    }
    nodes.set(node.id, node);
  }

  const roots = [...nodes.values()].filter((n) => !n.parent);
  if (roots.length !== 1) {
    errors.push(`expected exactly 1 root node (no parent), found ${roots.length}: ${roots.map((r) => r.id).join(', ') || 'none'}`);
  } else if (roots[0].level !== 'body') {
    errors.push(`root node "${roots[0].id}" must have level "body"`);
  }

  for (const node of nodes.values()) {
    if (node.parent) {
      const parent = nodes.get(node.parent);
      if (!parent) errors.push(`${node.id}: parent "${node.parent}" does not exist`);
      else if (!parent.children.includes(node.id)) errors.push(`${node.id}: parent "${parent.id}" does not list it in children`);
    }
    for (const childId of node.children) {
      const child = nodes.get(childId);
      if (!child) {
        errors.push(`${node.id}: child "${childId}" does not exist`);
        continue;
      }
      if (child.parent !== node.id) errors.push(`${node.id}: child "${childId}" names "${child.parent}" as its parent`);
      if (levelIndex(child.level) !== levelIndex(node.level) + 1) {
        errors.push(`${node.id} (${node.level}): child "${childId}" is "${child.level}"; each zoom must move down exactly one level`);
      }
    }
    for (const h of node.visual.hotspots) {
      if (!node.children.includes(h.target)) errors.push(`${node.id}: hotspot target "${h.target}" is not a child`);
    }
    for (const rel of node.related) {
      if (rel === node.id) errors.push(`${node.id}: related lists itself`);
      else if (!nodes.has(rel)) warnings.push(`${node.id}: related "${rel}" does not exist yet (hidden until it does)`);
    }
  }

  return { tree: errors.length === 0 ? buildTree([...nodes.values()]) : null, errors, warnings };
}
