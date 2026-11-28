import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import WebKit from 'gi://WebKit?version=6.0';

import { WindowController } from './window-controller.js';
import { onCall, onMessage } from './messaging.js';
import { createPopups } from './popup.js';
import { makeContentManager, makeSettings, makeTransparent, runScript } from './webview.js';

export class AppWindow {

    win;

    view;

    constructor(app, title, width, height, uri, api, desktop, bridge) {
        const contentManager = makeContentManager(bridge);
        const view = new WebKit.WebView({ user_content_manager: contentManager, settings: makeSettings() });
        makeTransparent(view);
        this.view = view;

        const win = new Adw.ApplicationWindow({
            application: app,
            title: title ?? '',
            default_width: width,
            default_height: height,
            content: view,
        });
        this.win = win;

        const popups = createPopups(view);

        const controller = new WindowController(
            {
                close: () => win.close(),
                minimize: () => win.minimize(),
                maximize: () => win.maximize(),
                unmaximize: () => win.unmaximize(),
                get maximized() { return win.maximized; },
                get active() { return win.is_active; },
                toplevelState() {
                    const st = win.get_surface()?.get_state() ?? 0;
                    return {
                        fullscreen: (st & Gdk.ToplevelState.FULLSCREEN) !== 0,
                        maximized: (st & Gdk.ToplevelState.MAXIMIZED) !== 0,
                        minimized: (st & Gdk.ToplevelState.MINIMIZED) !== 0,
                    };
                },
                beginMove(device, x, y, time) {
                    win.get_surface()?.begin_move(device, Gdk.BUTTON_PRIMARY, x, y, time);
                    // The compositor now owns the press, so the view never
                    // sees its release. Left alone, WebKit's click gesture
                    // would take the next press as part of this one, and a
                    // double click straight after a drag would go unseen.
                    const controllers = view.observe_controllers();
                    for (let i = 0; i < controllers.get_n_items(); i++) {
                        controllers.get_item(i).reset();
                    }
                },
                runScript: (script) => runScript(view, script),
                closePopups: () => popups.closeAll(),
                later(milliseconds, fn) {
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => {
                        fn();
                        return GLib.SOURCE_REMOVE;
                    });
                },
            },
            desktop,
            api,
        );

        onCall(contentManager, 'app', (msg) => controller.call(msg?.method, msg?.args));
        onMessage(contentManager, 'appDesktopStyle', () => controller.desktopStyleRequested());
        onMessage(contentManager, 'appPopup', (msg) => popups.handle(msg));

        // Primary presses, seen before WebKit and left to it.
        const presses = new Gtk.EventControllerLegacy({ propagation_phase: Gtk.PropagationPhase.CAPTURE });
        presses.connect('event', (_c, event) => {
            if (event.get_event_type() === Gdk.EventType.BUTTON_PRESS &&
                event.get_button() === Gdk.BUTTON_PRIMARY) {
                const [, x, y] = event.get_position();
                controller.recordPress(event.get_device(), x, y, event.get_time());
            }
            return Gdk.EVENT_PROPAGATE;
        });
        view.add_controller(presses);

        win.connect('realize', () => {
            win.get_surface().connect('notify::state', () => controller.stateChanged());
        });
        win.connect('notify::is-active', () => controller.activeChanged());
        win.connect('close-request', () => { popups.closeAll(); return false; });

        // Without a title of its own the window takes the page's <title>,
        // and follows it when the page changes document.title.
        if (title === undefined) {
            view.connect('notify::title', () => {
                if (view.title) win.title = view.title;
            });
        }

        view.load_uri(uri);
        win.present();
    }
}
