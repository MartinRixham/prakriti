import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import System from 'system';

import { Desktop } from './desktop.js';
import { iconApi } from './icons.js';
import { AppWindow } from './window.js';

function readText(file) {
    const [, bytes] = file.load_contents(null);
    return new TextDecoder().decode(bytes);
}

export function run({ id, title, width = 1000, height = 680, frontend = 'frontend', api = {} }) {
    const frontendDir = Gio.File.new_for_path(System.programPath)
        .get_parent().resolve_relative_path(frontend);

    GLib.set_prgname(id);

    if (title) {
        GLib.set_application_name(title);
    }

    const bridge = readText(Gio.File.new_for_uri(import.meta.url)
        .get_parent().resolve_relative_path('inject/bridge.js'));

    const app = new Adw.Application({
        application_id: id,
        flags: Gio.ApplicationFlags.CAN_OVERRIDE_APP_ID,
    });

    let main = null;

    app.connect('startup', () => {
        Gtk.Window.set_default_icon_name(id);
    });

    app.connect('activate', () => {
        if (main) {
            main.win.present();
            return;
        }

        main = new AppWindow(app, {
            title, width, height,
            uri: frontendDir.get_child('index.html').get_uri(),
            api: { icon: iconApi(), ...api },
            desktop: new Desktop(Adw.StyleManager.get_default(), Gtk.Settings.get_default()),
            bridge,
        });

        main.win.connect('destroy', () => { main = null; });

        if (!title) {
            const handler = main.view.connect('notify::title', (view) => {
                if (view.title) {
                    GLib.set_application_name(view.title);
                    view.disconnect(handler);
                }
            });
        }
    });

    return app.run([id, ...ARGV]);
}
