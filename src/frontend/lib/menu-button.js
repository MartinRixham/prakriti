import { Binding } from './datum/Datum.js';
import { loadIcon, loadTemplate } from './files.js';


const POPUP_ID = 'main-menu';

export class MenuButton {

    #menu;

    open = false;

    constructor(menu) {
        this.#menu = menu;
    }

    async onBind(element) {
        element.innerHTML = await loadTemplate("lib/html/button.html");

        window.addEventListener('apppopup', ({ detail }) => {
            if (detail.type === 'activate') {
                this.#menu.activate(detail.value);
            }
            else if (detail.type === 'closed') {
                this.open = false;
            }
        });
    }

    #openPopup(element) {
        const { x, y, width, height } = element.getBoundingClientRect();

        window.webkit.messageHandlers.appPopup.postMessage({
            type: 'open',
            id: POPUP_ID,
            page: this.#menu.page(),
            anchor: { x, y, width, height },
            data: this.#menu.data(),
        });
    }

    button = new Binding({
        async init(element) {
            element.innerHTML = await loadIcon("actions/open-menu-symbolic.svg");
            element.id = "menu-button"
            element.title = "Main Menu";
            element.setAttribute("aria-label", "Main Menu");
            element.setAttribute("aria-haspopup", "menu");
        },
        update(element) {
            element.classList.toggle('checked', this.open);
            element.setAttribute("aria-expanded", String(this.open));
        },
        click(_, element) {
            if (!this.open) {
                this.#openPopup(element);
                this.open = true;
            }
        }
    });
}
