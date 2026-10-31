// "virtual:content" is produced by the validate-content plugin in vite.config.ts: every node,
// already checked against the schema and the tree rules, so the build fails on bad content and
// the browser never needs Zod.
import nodes from 'virtual:content';
import type { BodyNode } from './schema.ts';
import { buildTree } from './tree.ts';

export const tree = buildTree(nodes as BodyNode[]);
