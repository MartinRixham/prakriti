export const WIN_ID = 'main';

export const FOCUS_LOSS_GRACE_MILLISECONDS = 100;

function emitScript(name, detail) {
    return `window.__appEmit?.(${JSON.stringify(name)},${JSON.stringify(detail ?? null)})`;
}

function desktopStyleScript(buttonLayout, accent) {
    const style = { buttonLayout: buttonLayout || null, accent: accent || null };
    return `window.__appDesktopStyle=${JSON.stringify(style)};window.dispatchEvent(new Event('appdesktopstyle'))`;
}

export class WindowController {

    #host;

    #api;

    #desktop;

    #lastPress = null;

    #lastState = '';

    #wantsDesktopStyle = false;

    constructor(host, desktop, api = {}) {
        this.#host = host;
        this.#api = api;
        this.#desktop = desktop;
        desktop.onChange(() => this.desktopChanged());
    }

    call(method, args) {
        const host = this.#host;

        switch (method) {
            case 'api.call': {
                const name = args?.name;
                const fn = typeof name === 'string' && Object.hasOwn(this.#api, name) ? this.#api[name] : null;
                if (typeof fn !== 'function') throw new Error(`No such api: ${name}`);
                return fn.apply(this.#api, Array.isArray(args.args) ? args.args : []);
            }
            case 'win.close':
                // An open popup would keep the window's close from going through.
                host.closePopups();
                host.close();
                return null;
            case 'win.minimize':
                host.minimize();
                return null;
            case 'win.zoom':
                if (host.maximized) host.unmaximize();
                else host.maximize();
                return null;
            case 'win.getState':
                return this.state();
            case 'win.startDrag':
                this.startDrag();
                return null;
            case 'theme.get':
                return { dark: this.#desktop.dark };
            default:
                throw new Error(`Unknown call: ${method}`);
        }
    }

    recordPress(device, x, y, time) {
        this.#lastPress = { device, x, y, time };
    }

    startDrag() {
        const press = this.#lastPress;
        if (press) this.#host.beginMove(press.device, press.x, press.y, press.time);
    }

    state() {
        const { fullscreen, maximized, minimized } = this.#host.toplevelState();
        return {
            win: WIN_ID,
            fullscreen: !!fullscreen,
            maximized: !fullscreen && !!maximized,
            minimized: !!minimized,
            focused: !!this.#host.active,
        };
    }

    // The window's state may have changed; tell the page if it has.
    stateChanged() {
        const state = this.state();
        const key = JSON.stringify(state);
        if (key === this.#lastState) return;
        this.#lastState = key;
        this.#host.runScript(emitScript('window-state', state));
    }

    // Gaining the focus is reported at once, losing it only if it lasts.
    activeChanged() {
        if (this.#host.active) this.stateChanged();
        else this.#host.later(FOCUS_LOSS_GRACE_MILLISECONDS, () => this.stateChanged());
    }

    // The page asked for the desktop style: send it now and on every change.
    desktopStyleRequested() {
        this.#wantsDesktopStyle = true;
        this.#sendDesktopStyle();
    }

    desktopChanged() {
        this.#host.runScript(emitScript('theme', { dark: this.#desktop.dark }));
        this.#sendDesktopStyle();
    }

    #sendDesktopStyle() {
        if (!this.#wantsDesktopStyle) return;
        this.#host.runScript(desktopStyleScript(this.#desktop.buttonLayout, this.#desktop.accent));
    }
}
