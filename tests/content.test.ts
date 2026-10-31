import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateContent, type RawFile } from '../src/content-validate.ts';
import { readContentFiles } from '../src/read-content-files.ts';
import { wordCount } from '../src/schema.ts';
import { ancestry, pathFor, resolvePath } from '../src/tree.ts';

const files = readContentFiles(resolve(import.meta.dirname, '../content'));
const result = validateContent(files);
const tree = result.tree!;
const nodes = tree ? [...tree.nodes.values()] : [];

describe('content', () => {
  it('passes schema and tree validation', () => {
    expect(result.errors).toEqual([]);
    expect(tree).not.toBeNull();
  });

  // The handoff's per-node content checklist.
  describe.each(nodes.map((n) => [n.id, n] as const))('%s', (_id, node) => {
    it('has a summary of 120 words or fewer', () => {
      expect(node.summary.trim().length).toBeGreaterThan(0);
      expect(wordCount(node.summary)).toBeLessThanOrEqual(120);
    });
    it('has a "how it connects" line', () => {
      expect(node.connectsUp.trim().length).toBeGreaterThan(0);
    });
    it('cites at least 1 source', () => {
      expect(node.sources.length).toBeGreaterThanOrEqual(1);
    });
    it('keeps "go deeper" to 250 words or fewer', () => {
      if (node.deeper) expect(wordCount(node.deeper)).toBeLessThanOrEqual(250);
    });
    it('has 4 or fewer key stats', () => {
      expect(node.stats.length).toBeLessThanOrEqual(4);
    });
  });

  it('reaches a molecule from the body in 6 clicks or fewer on the oxygen pathway', () => {
    const chain = ancestry(tree, 'hemoglobin');
    expect(chain[0].id).toBe('body');
    expect(chain.at(-1)!.level).toBe('molecule');
    expect(chain.length - 1).toBeLessThanOrEqual(6);
  });
});

describe('validation rejects bad content', () => {
  const good = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 'body',
    level: 'body',
    title: 'Body',
    parent: null,
    children: [],
    summary: 'Short summary.',
    connectsUp: 'Top level.',
    sources: [{ title: 'OpenStax', url: 'https://openstax.org' }],
    ...overrides,
  });
  const run = (...data: Record<string, unknown>[]) =>
    validateContent(data.map((d): RawFile => ({ file: `${d.id}.json`, data: d })));

  it('accepts a minimal valid root', () => {
    expect(run(good()).errors).toEqual([]);
  });
  it('rejects a summary over 120 words', () => {
    expect(run(good({ summary: 'word '.repeat(121) })).errors.join()).toMatch(/120 words/);
  });
  it('rejects a node with no sources', () => {
    expect(run(good({ sources: [] })).errors.join()).toMatch(/at least 1 source/);
  });
  it('rejects a missing connectsUp', () => {
    expect(run(good({ connectsUp: undefined })).errors.length).toBeGreaterThan(0);
  });
  it('rejects unknown fields', () => {
    expect(run(good({ colour: 'red' })).errors.length).toBeGreaterThan(0);
  });
  it('rejects a child that skips a level', () => {
    const child = good({ id: 'rbc', level: 'cell', parent: 'body', title: 'Red blood cell' });
    expect(run(good({ children: ['rbc'] }), child).errors.join()).toMatch(/exactly one level/);
  });
  it('rejects a child that does not exist', () => {
    expect(run(good({ children: ['ghost'] })).errors.join()).toMatch(/does not exist/);
  });
  it('rejects a hotspot that targets a non-child', () => {
    const visual = { hotspots: [{ target: 'ghost', shape: 'circle', x: 0.5, y: 0.5, r: 0.1 }] };
    expect(run(good({ visual })).errors.join()).toMatch(/not a child/);
  });
  it('rejects malformed JSON', () => {
    expect(validateContent([{ file: 'x.json', data: { jsonParseError: 'Unexpected token' } }]).errors.length).toBeGreaterThan(0);
  });
});

describe('routing', () => {
  it('builds full paths from ancestry', () => {
    expect(pathFor(tree, 'body')).toBe('/');
    expect(pathFor(tree, 'hemoglobin')).toBe('/cardiovascular/blood/blood-tissue/rbc/rbc-membrane/hemoglobin');
  });
  it('resolves shortened links to the right node and its canonical path', () => {
    const { node, canonical } = resolvePath(tree, '/cardiovascular/blood/rbc');
    expect(node?.title).toBe('Red blood cell');
    expect(canonical).toBe('/cardiovascular/blood/blood-tissue/rbc');
  });
  it('returns no node for an unknown id', () => {
    expect(resolvePath(tree, '/nope').node).toBeNull();
  });
});
