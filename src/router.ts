import { useEffect, useState } from 'react';

const readHash = () => decodeURIComponent(window.location.hash.replace(/^#/, '')) || '/';

/** Current hash path, e.g. "/cardiovascular/blood". Updates on browser back/forward too. */
export function useHashPath(): string {
  const [path, setPath] = useState(readHash);
  useEffect(() => {
    const onChange = () => setPath(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export const hrefFor = (path: string) => `#${path}`;

export function navigate(path: string, { replace = false } = {}) {
  if (replace) window.location.replace(hrefFor(path));
  else window.location.hash = path;
}
