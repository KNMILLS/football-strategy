import { getLogText } from '../util/dom';
export async function copyLogToClipboard(_bus) {
    const text = getLogText();
    try {
        const nav = typeof navigator !== 'undefined' ? navigator : null;
        if (nav && nav.clipboard && nav.clipboard.writeText) {
            await nav.clipboard.writeText(text);
            return;
        }
    }
    catch { }
    try {
        if (typeof document !== 'undefined') {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select?.();
            try {
                document.execCommand && document.execCommand('copy');
            }
            catch { }
            document.body.removeChild(ta);
        }
    }
    catch { }
}
//# sourceMappingURL=clipboard.js.map