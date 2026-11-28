import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk?version=4.0';
import WebKit from 'gi://WebKit?version=6.0';

import { eventScript } from './protocol.js';

export const DEBUG = !!GLib.getenv('APP_DEBUG');

export function makeSettings() {
    return new WebKit.Settings({
        // The frontend's module scripts and fetch()ed templates load from file://.
        allow_file_access_from_file_urls: true,
        enable_developer_extras: DEBUG,
        enable_write_console_messages_to_stdout: DEBUG,
        enable_webgl: true,
        javascript_can_access_clipboard: true,
    });
}

export function makeTransparent(view) {
    view.set_background_color(new Gdk.RGBA({ red: 0, green: 0, blue: 0, alpha: 0 }));
}

// A user content manager that runs `script` at the start of each page.
export function makeContentManager(script) {
    const contentManager = new WebKit.UserContentManager();
    contentManager.add_script(new WebKit.UserScript(script,
        WebKit.UserContentInjectedFrames.TOP_FRAME,
        WebKit.UserScriptInjectionTime.START, null, null));
    return contentManager;
}

export function runScript(view, script) {
    view.evaluate_javascript(script, -1, null, null, null, null);
}

// A CustomEvent on the page's window.
export function fireEvent(view, name, detail) {
    runScript(view, eventScript(name, detail));
}
