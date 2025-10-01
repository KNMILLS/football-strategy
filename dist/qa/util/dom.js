export function sleepFrame() {
    return new Promise((resolve) => {
        try {
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => resolve());
            }
            else {
                setTimeout(resolve, 0);
            }
        }
        catch {
            setTimeout(resolve, 0);
        }
    });
}
export function getLogText() {
    if (typeof document === 'undefined')
        return '';
    const el = document.getElementById('log');
    return (el && el.textContent) ? el.textContent : '';
}
export function setLogText(text) {
    if (typeof document === 'undefined')
        return;
    const el = document.getElementById('log');
    if (el) {
        el.textContent = text;
        el.scrollTop = el.scrollHeight;
    }
}
export function $(id) {
    if (typeof document === 'undefined')
        return null;
    return document.getElementById(id);
}
//# sourceMappingURL=dom.js.map