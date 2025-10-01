import { sleepFrame } from '../util/dom';
export async function runAutoGame(bus, p) {
    try {
        const seed = (typeof p?.seed === 'number' && p.seed > 0) ? p.seed : Math.floor(Math.random() * 1e9);
        bus.emit('qa:startTestGame', { seed });
        await sleepFrame();
    }
    catch (e) {
        bus.emit('log', { message: `DEV: Error in runAutoGame: ${e?.message || e}` });
    }
}
//# sourceMappingURL=runAutoGame.js.map