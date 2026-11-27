import { Binding } from './datum/Datum.js';
import { loadIcon, loadTemplate } from './files.js';

export class Button {

    #title;

    #icon;

    #action;

    constructor(title, icon, action) {
        this.#title = title;
        this.#icon = icon;
        this.#action = action;
    }

    async onBind(element) {
        element.innerHTML = await loadTemplate("lib/html/button.html");
    }

    button = new Binding({
        async init(element) {
            element.title = this.#title;
            element.innerHTML = await loadIcon(this.#icon);
        },
        click() { this.#action() }
    });
}
