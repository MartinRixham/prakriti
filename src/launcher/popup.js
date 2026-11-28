import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import WebKit from 'gi://WebKit?version=6.0';

import { Popups } from './popups.js';
import { popupInitScript } from './protocol.js';
import { onMessage } from './messaging.js';
import { fireEvent, makeContentManager, makeSettings, makeTransparent } from './webview.js';

const POPOVER_STYLE = 'popover.web-popup > contents { padding: 0; }';

let styleInstalled = false;

function installStyle() {
    if (styleInstalled) return;
    styleInstalled = true;
    const provider = new Gtk.CssProvider();
    provider.load_from_string(POPOVER_STYLE);
    Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function createPopover(opener, id, uri, anchor, data, session) {
    const contentManager = makeContentManager(popupInitScript(id, data));
    onMessage(contentManager, 'appPopup', (msg) => session.pageMessage(msg));

    const view = new WebKit.WebView({
        related_view: opener,
        user_content_manager: contentManager,
        settings: makeSettings(),
    });
    makeTransparent(view);

    installStyle();
    const popover = new Gtk.Popover({
        child: view,
        position: Gtk.PositionType.BOTTOM,
        pointing_to: new Gdk.Rectangle(anchor),
        css_classes: ['web-popup'],
    });
    popover.set_parent(opener);
    popover.connect('closed', () => session.closed());

    view.load_uri(uri);

    return {
        show(width, height) {
            view.set_size_request(width, height);
            popover.popup();
            view.grab_focus();
        },
        popdown: () => popover.popdown(),
        dispose() {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                popover.unparent();
                return GLib.SOURCE_REMOVE;
            });
        },
    };
}

export function createPopups(opener) {
    return new Popups(
        {
            uri: () => opener.get_uri(),
            fireEvent: (name, detail) => fireEvent(opener, name, detail),
        },
        (id, uri, anchor, data, session) => createPopover(opener, id, uri, anchor, data, session),
    );
}
