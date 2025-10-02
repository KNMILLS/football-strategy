export class Hotkeys {
    active = false;
    bindings = [];
    onKeydown = (e) => {
        if (!this.active)
            return;
        // Ignore when typing in inputs
        const target = e.target;
        const tag = (target && target.tagName) ? target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select')
            return;
        for (const b of this.bindings) {
            if (b.key.toLowerCase() === e.key.toLowerCase()) {
                if (b.when && !b.when())
                    continue;
                if (b.preventDefault !== false)
                    e.preventDefault();
                try {
                    b.handler(e);
                }
                catch { }
                break;
            }
        }
    };
    enable() {
        if (this.active)
            return;
        this.active = true;
        if (typeof document !== 'undefined')
            document.addEventListener('keydown', this.onKeydown);
    }
    disable() {
        if (!this.active)
            return;
        this.active = false;
        if (typeof document !== 'undefined')
            document.removeEventListener('keydown', this.onKeydown);
    }
    register(spec) {
        this.bindings.push(spec);
        return () => {
            const i = this.bindings.indexOf(spec);
            if (i >= 0)
                this.bindings.splice(i, 1);
        };
    }
}
//# sourceMappingURL=Hotkeys.js.map