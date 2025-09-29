export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function applyReducedMotionFlag(): boolean {
  if (typeof document === 'undefined') return false;
  const reduced = prefersReducedMotion();
  try {
    if (reduced) (document.body as any).dataset.reducedMotion = '1';
    else delete (document.body as any).dataset.reducedMotion;
  } catch {}
  return reduced;
}


