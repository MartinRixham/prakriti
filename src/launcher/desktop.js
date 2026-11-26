export function rgbaToHex({ red, green, blue }) {
    return `#${[red, green, blue]
        .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0'))
        .join('')}`;
}

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

    // fn(desktop) after any change.
    onChange(fn) {
        const changed = () => fn(this);
        this.#style.connect('notify::dark', changed);
        this.#style.connect('notify::accent-color', changed);
        this.#style.connect('notify::system-supports-accent-colors', changed);
        this.#settings.connect('notify::gtk-decoration-layout', changed);
    }
}
