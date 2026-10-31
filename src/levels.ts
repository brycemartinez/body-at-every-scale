// Kept separate from schema.ts so the browser bundle doesn't pull in Zod.
import type { BodyNode } from './schema.ts';

/** The 7 fixed zoom levels, outermost first. Index = depth. */
export const LEVELS = ['body', 'system', 'organ', 'tissue', 'cell', 'organelle', 'molecule'] as const;
export type Level = (typeof LEVELS)[number];

/** Labels and real-world scale ranges from the handoff's zoom-level table. */
export const LEVEL_INFO: Record<Level, { label: string; scale: string }> = {
  body: { label: 'Body', scale: '~1.7 m' },
  system: { label: 'Organ system', scale: '~0.3–1.7 m' },
  organ: { label: 'Organ', scale: '~1–30 cm' },
  tissue: { label: 'Tissue', scale: '~0.1–1 mm' },
  cell: { label: 'Cell', scale: '~1–100 µm' },
  organelle: { label: 'Organelle / structure', scale: '~10 nm–10 µm' },
  molecule: { label: 'Molecule', scale: '~0.1–10 nm' },
};

export const levelIndex = (level: Level) => LEVELS.indexOf(level);

/** A stat labelled "Size" is shown as the node's real size. */
export const sizeOf = (node: BodyNode) => node.stats.find((s) => s.label.toLowerCase() === 'size')?.value;
