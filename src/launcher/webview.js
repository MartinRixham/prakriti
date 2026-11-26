import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk?version=4.0';
import Soup from 'gi://Soup?version=3.0';
import WebKit from 'gi://WebKit?version=6.0';

import { eventScript } from './protocol.js';

// APP_DEBUG=1 turns on the inspector (right click → Inspect Element) and
// copies the pages' console to stdout.
export const DEBUG = !!GLib.getenv('APP_DEBUG');

export function makeSettings() {
    return new WebKit.Settings({
        enable_developer_extras: DEBUG,
        enable_write_console_messages_to_stdout: DEBUG,
        enable_webgl: true,
        javascript_can_access_clipboard: true,
    });
}

// A clear page background, so GTK's own background shows until the page
// paints, and wherever it leaves gaps.
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

// Finish an app:// request as an HTTP-like response: a status and a
// Content-Type header, so fetch() sees response.status, response.ok and
// response.headers as it would from a server.
export function respond(request, { status, reason, type, stream, size }) {
    const response = WebKit.URISchemeResponse.new(stream, size);
    response.set_status(status, reason ?? null);
    response.set_content_type(type);

    const headers = Soup.MessageHeaders.new(Soup.MessageHeadersType.RESPONSE);
    headers.append('Content-Type', type);
    headers.append('Content-Length', String(size));
    response.set_http_headers(headers);

    request.finish_with_response(response);
}
