// Helpers for the integration tests: waiting on GTK and WebKit, and reading
// back what a web view's page holds.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import WebKit from 'gi://WebKit?version=6.0';

Gio._promisify(WebKit.WebView.prototype, 'evaluate_javascript');
Gio._promisify(WebKit.WebView.prototype, 'call_async_javascript_function');

// The URI of a page in fixtures/.
export const fixture = (name) =>
    GLib.Uri.resolve_relative(import.meta.url, `fixtures/${name}`, GLib.UriFlags.NONE);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// fn()'s first truthy value, asked for every 20ms for up to 3s.
export async function waitFor(fn, what) {
    for (let i = 0; i < 150; i++) {
        const value = await fn();
        if (value) return value;
        await delay(20);
    }
    throw new Error(`gave up waiting for ${what}`);
}

// What `expression` is in the view's page, read back as JSON.
export async function evaluate(view, expression) {
    const value = await view.evaluate_javascript(`JSON.stringify(${expression})`, -1, null, null, null);
    const json = value.to_string();
    return json === 'undefined' ? undefined : JSON.parse(json);
}

// What `expression` settles to in the view's page, read back as JSON. A
// rejection throws its message.
export async function settle(view, expression) {
    const value = await view.call_async_javascript_function(
        `return JSON.stringify(await (${expression}))`, -1, null, null, null, null);
    const json = value.to_string();
    return json === 'undefined' ? undefined : JSON.parse(json);
}

// Resolves once the view has finished loading its page.
export function loaded(view) {
    return new Promise((resolve) => {
        const handler = view.connect('load-changed', (_view, event) => {
            if (event === WebKit.LoadEvent.FINISHED) {
                view.disconnect(handler);
                resolve();
            }
        });
    });
}

export function popoversOf(widget) {
    const popovers = [];
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling()) {
        if (child instanceof Gtk.Popover) popovers.push(child);
    }
    return popovers;
}
