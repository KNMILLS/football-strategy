const debugBuffer = { entries: [] };
export function pushDebugEntry(text) {
    try {
        debugBuffer.entries.push(String(text));
    }
    catch { }
}
export function resetDebugEntries() {
    debugBuffer.entries = [];
}
export function setDebugSeed(seed) {
    debugBuffer.seed = seed;
}
export function getDebugSeed() {
    return debugBuffer.seed;
}
export function getDebugEntries() {
    return debugBuffer.entries.slice();
}
//# sourceMappingURL=buffer.js.map