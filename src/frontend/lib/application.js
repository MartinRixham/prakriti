import { Binding } from './datum/Datum.js';
import { loadTemplate } from './files.js';

export class Application {

    #defaultControlConfig = ":close"

    window;

    constructor(window) {
        this.window = window;
    }

    rootState = new Binding({
        update() {
            const root = document.documentElement;

            if (this.window.theme.length) {
                root.style.colorScheme = this.window.theme;
                root.dataset.theme = this.window.theme;
            }
            else {
                this.window.setTheme(matchMedia('(prefers-color-scheme: dark)').matches);
            }

            if (this.window.accent) {
                root.style.setProperty('--accent-bg', this.window.accent);
            }
            else {
                root.style.removeProperty('--accent-bg');
            }

            root.classList.toggle('backdrop', !this.window.focused);
            root.classList.toggle('maximized', this.window.maximized);
            root.classList.toggle('fullscreen', this.window.fullscreen);
        },
    });

    async onBind(element) {
        element.innerHTML = await loadTemplate("lib/html/application.html")

        const theme = await app.theme.get();

        this.window.setTheme(theme.dark);
        app.theme.on((dark) => this.window.setTheme(dark));

        this.#watchDesktopStyle();

        app.win.onState((state) => {

            if (state.win !== app.win.id) {
                return;
            }

            this.window.setWindowState(state);
        });


        const state = await app.win.getState();

        if (state) {
            this.window.setWindowState(state);
        }
    }

    #watchDesktopStyle() {
        window.addEventListener('appdesktopstyle', () => {
            const { buttonLayout, accent } = window.__appDesktopStyle ?? {};
            this.window.accent = accent ?? '';
            this.window.setButtonLayout(buttonLayout ?? this.#defaultControlConfig);
        });

        this.window.setButtonLayout(this.#defaultControlConfig);
        window.webkit?.messageHandlers?.appDesktopStyle?.postMessage(null);
    }
}
