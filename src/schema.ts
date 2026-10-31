import { z } from 'zod';
import { LEVELS } from './levels.ts';

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const maxWords = (max: number) => (text: string) => wordCount(text) <= max;

const unit = z.number().min(0).max(1);

/** Hotspot coordinates are fractions of the scene's width/height. */
const hotspotSchema = z.discriminatedUnion('shape', [
  z.object({ target: z.string(), shape: z.literal('circle'), x: unit, y: unit, r: unit }),
  z.object({ target: z.string(), shape: z.literal('rect'), x: unit, y: unit, w: unit, h: unit }),
]);

/** One stop in the explorer. Field-for-field the schema in HANDOFF.md. */
export const nodeSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase kebab-case'),
    level: z.enum(LEVELS),
    title: z.string().min(1),
    /** Omitted or null only on the root "body" node. */
    parent: z.string().nullable().optional(),
    children: z.array(z.string()).default([]),
    summary: z.string().min(1).refine(maxWords(120), 'summary must be 120 words or fewer'),
    connectsUp: z.string().min(1, 'connectsUp is required'),
    deeper: z.string().refine(maxWords(250), 'deeper must be 250 words or fewer').optional(),
    clinical: z.string().optional(),
    /** 2–4 key facts. A stat labelled "Size" is shown as the node's real size. */
    stats: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).max(4).default([]),
    related: z.array(z.string()).default([]),
    visual: z
      .object({
        asset: z.string().optional(),
        hotspots: z.array(hotspotSchema).default([]),
      })
      .default({ hotspots: [] }),
    sources: z
      .array(z.object({ title: z.string().min(1), url: z.url() }))
      .min(1, 'at least 1 source is required'),
  })
  .strict();

export type BodyNode = z.infer<typeof nodeSchema>;
export type Hotspot = z.infer<typeof hotspotSchema>;
