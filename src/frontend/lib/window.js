import { loadTemplate } from './files.js';

export class Window {

    theme = "";          // 'true' / 'false' from the desktop, '' while unknown

    accent = "";        // the user's GNOME accent colour, '' if unknown

    focused = true;

    maximized = false;

    fullscreen = false;

    headerBar;

    constructor(headerBar) {
        this.headerBar = headerBar;
    }

    async onBind(element) {
        element.innerHTML = await loadTemplate("lib/html/window.html");
    }

    setTheme(dark) {
        this.theme = dark ? "dark" : "light";
    }

    setWindowState(state) {
        this.focused = !!state.focused;
        this.fullscreen = !!state.fullscreen;

        if ('maximized' in state) {
            this.maximized = !!state.maximized;
        }
    }

    setButtonLayout(layout) {
        this.headerBar.setButtonLayout(layout);
    }
}
