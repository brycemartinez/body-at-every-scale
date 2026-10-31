import { useEffect, useRef } from 'react';
import { tree } from './content-loader.ts';
import { levelIndex } from './levels.ts';
import { pathFor, resolvePath } from './tree.ts';
import { navigate, useHashPath } from './router.ts';
import { Viewport, type Direction } from './components/Viewport.tsx';
import { InfoPanel } from './components/InfoPanel.tsx';
import { Breadcrumb } from './components/Breadcrumb.tsx';
import { ScaleRuler } from './components/ScaleRuler.tsx';

export default function App() {
  const path = useHashPath();
  const { node: found, canonical } = resolvePath(tree, path);
  const node = found ?? tree.root;
  const parent = node.parent ? (tree.nodes.get(node.parent) ?? null) : null;

  // Zoom direction for the scene transition: deeper level = "in".
  const prevDepth = useRef(levelIndex(node.level));
  const depth = levelIndex(node.level);
  const direction: Direction = depth >= prevDepth.current ? 'in' : 'out';
  useEffect(() => {
    prevDepth.current = depth;
  }, [depth]);

  // Shortened or stale links (e.g. "/cardiovascular/blood/rbc") redirect to the full path.
  useEffect(() => {
    if (found && path !== canonical) navigate(canonical, { replace: true });
  }, [found, path, canonical]);

  useEffect(() => {
    document.title = `${node.title} · Body at Every Scale`;
    // Keep keyboard users in the scene after a hotspot they pressed disappears.
    const active = document.activeElement;
    if (!active || active === document.body || active.closest('#scene')) {
      document.getElementById('scene')?.focus({ preventScroll: true });
    }
  }, [node]);

  // Esc goes up one level.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (parent) navigate(pathFor(tree, parent.id));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [parent]);

  return (
    <div className="app">
      <a className="skip-link" href="#panel-title" onClick={(e) => {
        e.preventDefault();
        document.getElementById('panel-title')?.focus();
      }}>
        Skip to description
      </a>
      <header className="topbar">
        <a className="brand" href="#/">
          Body at Every Scale
        </a>
        <Breadcrumb tree={tree} node={node} />
      </header>
      <main className="layout">
        <ScaleRuler tree={tree} node={node} />
        <Viewport tree={tree} node={node} parent={parent} direction={direction} onNavigate={(id) => navigate(pathFor(tree, id))} />
        <InfoPanel tree={tree} node={node} />
      </main>
      <p className="visually-hidden" aria-live="polite">
        {found ? `${node.title}` : `No page found for “${path}”. Showing the whole body.`}
      </p>
    </div>
  );
}
