import { rgbaToHex } from "./colour.js";

export class Desktop {

    #style;

    #settings;

    constructor(styleManager, gtkSettings) {
        this.#style = styleManager;
        this.#settings = gtkSettings;
    }

    get dark() {
        return !!this.#style.dark;
    }

    get accent() {
        return this.#style.system_supports_accent_colors ? rgbaToHex(this.#style.get_accent_color_rgba()) : '';
    }

    get buttonLayout() {
        return this.#settings.gtk_decoration_layout ?? '';
    }

    onChange(callback) {
        const changed = () => callback(this);
        this.#style.connect('notify::dark', changed);
        this.#style.connect('notify::accent-color', changed);
        this.#style.connect('notify::system-supports-accent-colors', changed);
        this.#settings.connect('notify::gtk-decoration-layout', changed);
    }
}
