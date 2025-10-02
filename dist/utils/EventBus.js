/**
 * Safely extracts an error message from an unknown error object
 */
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Unknown error occurred';
}
export class EventBus {
    listeners = {};
    on(event, handler) {
        const arr = (this.listeners[event] ||= []);
        arr.push(handler);
        return () => {
            const i = arr.indexOf(handler);
            if (i >= 0)
                arr.splice(i, 1);
        };
    }
    emit(event, payload) {
        const arr = this.listeners[event];
        if (!arr)
            return;
        for (const h of arr)
            h(payload);
    }
}
//# sourceMappingURL=EventBus.js.map