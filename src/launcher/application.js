import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import WebKit from 'gi://WebKit?version=6.0';

import { Desktop } from './desktop.js';
import { ORIGIN, registerScheme } from './scheme.js';
import { respond } from './webview.js';
import { AppWindow } from './window.js';

function readText(file) {
    const [, bytes] = file.load_contents(null);
    return new TextDecoder().decode(bytes);
}

/**
 * @param {object} options
 * @param {string} options.id          application id
 * @param {string} options.title
 * @param {number} options.width
 * @param {number} options.height
 * @param {Gio.File} options.frontend  directory holding index.html
 * @param {object} options.api         name → (args) => result, for app.api.call
 */
export function run({ id, title, width, height, frontend, api = {} }) {
    GLib.set_prgname(id);
    GLib.set_application_name(title);

    const bridge = readText(Gio.File.new_for_uri(import.meta.url)
        .get_parent().resolve_relative_path('inject/bridge.js'));

    const app = new Adw.Application({
        application_id: id,
        // --gapplication-app-id=… runs a second copy beside an installed one.
        flags: Gio.ApplicationFlags.CAN_OVERRIDE_APP_ID,
    });

    let main = null;

    app.connect('startup', () => {
        Gtk.Window.set_default_icon_name(id);
        registerScheme(WebKit.WebContext.get_default(), frontend, respond);
    });

    app.connect('activate', () => {
        if (main) {
            main.win.present();
            return;
        }
        main = new AppWindow(app, {
            title, width, height,
            uri: `${ORIGIN}/index.html`,
            api,
            desktop: new Desktop(Adw.StyleManager.get_default(), Gtk.Settings.get_default()),
            bridge,
        });
        main.win.connect('destroy', () => { main = null; });
    });

    return app.run([id, ...ARGV]);
}
