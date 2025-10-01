export function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
export function yardToPercent(absYard) {
    return 5 + (absYard / 100) * 90;
}
export function selectField(container) {
    if (typeof document === 'undefined')
        return null;
    if (container)
        return container;
    return $('field-display');
}
export function setAriaHidden(el) {
    el.setAttribute('aria-hidden', 'true');
}
export function clampPercent(v, min = 5, max = 95) {
    return Math.max(min, Math.min(max, v));
}
//# sourceMappingURL=utils.js.map