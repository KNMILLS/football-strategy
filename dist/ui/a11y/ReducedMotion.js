export function prefersReducedMotion() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
        return false;
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    catch {
        return false;
    }
}
export function applyReducedMotionFlag() {
    if (typeof document === 'undefined')
        return false;
    const reduced = prefersReducedMotion();
    try {
        if (reduced)
            document.body.dataset.reducedMotion = '1';
        else
            delete document.body.dataset.reducedMotion;
    }
    catch { }
    return reduced;
}
//# sourceMappingURL=ReducedMotion.js.map