/// <reference types="vitest/config" />
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { validateContent } from './src/content-validate.ts';
import { readArtFiles, readContentFiles } from './src/read-content-files.ts';

const contentDir = resolve(import.meta.dirname, 'content');
const artDir = resolve(import.meta.dirname, 'public/art');
const VIRTUAL_ID = 'virtual:content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Reads /content, validates every node, and serves the result as `virtual:content`.
 * Any invalid node fails `vite build` (and shows the error overlay in dev).
 */
function contentPlugin(): Plugin {
  return {
    name: 'validate-content',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const files = readContentFiles(contentDir);
      const art = readArtFiles(artDir);
      for (const f of files) this.addWatchFile(join(contentDir, f.file));
      for (const name of art.keys()) this.addWatchFile(join(artDir, name));
      const { tree, errors, warnings } = validateContent(files, art);
      for (const w of warnings) this.warn(w);
      if (!tree) this.error(`Content validation failed (${errors.length}):\n  ${errors.join('\n  ')}`);
      return `export default ${JSON.stringify([...tree.nodes.values()])};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(contentDir) && !file.startsWith(artDir)) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  // Relative base so the build works at any GitHub Pages subpath; hash routing does the rest.
  base: './',
  plugins: [react(), contentPlugin()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
