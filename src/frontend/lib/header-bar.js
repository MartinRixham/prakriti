import { Text } from './datum/Datum.js';
import { loadIcon, loadTemplate } from './files.js';
import { Minimize } from './minimize.js';
import { Maximize } from './maximize.js';
import { Close } from './close.js';

export class HeaderBar {

    #titleLabel;

    startControls = [];

    endControls = [];

    start;

    end

    constructor(title, start, end) {
        this.#titleLabel = title;
        this.start = start;
        this.end = end;
    }

    async onBind(element) {
        element.innerHTML = await loadTemplate("lib/html/header-bar.html");

        for (const element of document.querySelectorAll('[data-icon]')) {
            element.innerHTML = await loadIcon(element.dataset.icon);
        }
    }

    title = new Text(() => this.#titleLabel);

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
