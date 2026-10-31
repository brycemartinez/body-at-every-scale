import { ancestry, type ContentTree } from './tree.ts';

/** One hue per system, kept at every zoom level below it (see --sys-* tokens in styles.css). */
const SYSTEM_TOKENS: Record<string, string> = {
  cardiovascular: 'var(--sys-cardiovascular)',
  respiratory: 'var(--sys-respiratory)',
  nervous: 'var(--sys-nervous)',
  musculoskeletal: 'var(--sys-musculoskeletal)',
  digestive: 'var(--sys-digestive)',
  urinary: 'var(--sys-urinary)',
  endocrine: 'var(--sys-endocrine)',
  immune: 'var(--sys-immune)',
};

export function systemOf(tree: ContentTree, id: string): string | null {
  return ancestry(tree, id).find((n) => n.level === 'system')?.id ?? null;
}

export function hueFor(tree: ContentTree, id: string): string {
  const system = systemOf(tree, id);
  return (system && SYSTEM_TOKENS[system]) || 'var(--sys-default)';
}
