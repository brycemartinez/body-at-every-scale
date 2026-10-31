// Node-only: used by the build plugin in vite.config.ts and by the Vitest content checks.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RawFile } from './content-validate.ts';

export function readContentFiles(dir: string): RawFile[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const file = f.split('\\').join('/');
      try {
        return { file, data: JSON.parse(readFileSync(join(dir, f), 'utf8')) };
      } catch (e) {
        // Surface malformed JSON as a schema failure rather than crashing the read.
        return { file, data: { jsonParseError: (e as Error).message } };
      }
    });
}
