import { Text } from './datum/Datum.js';
import { loadIcon, loadTemplate } from './files.js';
import { Minimize } from './minimize.js';
import { Maximize } from './maximize.js';
import { Close } from './close.js';
import { MenuButton } from './menu-button.js';

export class HeaderBar {

    title = "";

    startControls = [];

    menu = new MenuButton(loadIcon, [
        [
            { label: "Preferences" },
            { label: "Keyboard Shortcuts" },
            { label: "About App" },
        ],
        [
            { label: "Quit", action: app.win.close },
        ],
    ]);

    endControls = [];

    constructor(title) {
        this.title = title;
    }

    async onBind(element) {
        element.innerHTML = await loadTemplate("lib/html/header-bar.html");

        for (const element of document.querySelectorAll('[data-icon]')) {
            element.innerHTML = await loadIcon(element.dataset.icon);
        }
    }

    titleLabel = new Text(() => this.title);

    setButtonLayout(layout) {
        const [start, end = ""] = layout.split(':');

        this.startControls = this.#getControls(start);
        this.endControls = this.#getControls(end);
    }

    #getControls(side) {
        return side.split(',').map((name) => {
            switch (name.trim()) {
                case 'minimize': return new Minimize(app.win, loadIcon);
                case 'maximize': return new Maximize(app.win, loadIcon, () => this.maximized);
                case 'close': return new Close(app.win, loadIcon);
                default: return null;
            }
        }).filter(Boolean);
    }
}
