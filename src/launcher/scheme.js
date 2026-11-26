import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { appPath, contentTypeFor } from './paths.js';

export const SCHEME = 'app';

export const ORIGIN = `${SCHEME}://main`;

function contentType(name) {
    return contentTypeFor(name) ?? Gio.content_type_get_mime_type(Gio.content_type_guess(name, null)[0]);
}

const REASONS = { 200: 'OK', 403: 'Forbidden', 404: 'Not Found' };

function textStream(text) {
    const bytes = new TextEncoder().encode(text);
    return { stream: Gio.MemoryInputStream.new_from_bytes(new GLib.Bytes(bytes)), size: bytes.length };
}

// A plain-text error page, so fetch() resolves with response.ok false (as
// it would over HTTP) and <script>/<img> loads still fail.
function fail(respond, request, status, message) {
    respond(request, { status, reason: REASONS[status], type: 'text/plain', ...textStream(`${message}\n`) });
}

// Answer one WebKitURISchemeRequest (get_path) from the files under `root`,
// a Gio.File directory, through respond(request, {status, reason, type,
// stream, size}).
export function serveRequest(root, request, respond) {
    const path = appPath(request.get_path());
    const file = path === null ? null : root.resolve_relative_path(path);

    // appPath refuses "..", and resolve_relative_path folds what's left;
    // anything outside still shows here.
    if (!file || !file.has_prefix(root)) {
        fail(respond, request, 403, `Outside the app: ${request.get_path()}`);
        return;
    }

    file.read_async(GLib.PRIORITY_DEFAULT, null, (f, res) => {
        let stream, size;
        try {
            stream = f.read_finish(res);
            size = stream.query_info('standard::size', null).get_size();
        }
        catch {
            fail(respond, request, 404, `Not found: ${request.get_path()}`);
            return;
        }
        respond(request, { status: 200, reason: REASONS[200], type: contentType(file.get_basename()), stream, size });
    });
}

export function registerScheme(context, root, respond) {
    context.register_uri_scheme(SCHEME, (request) => serveRequest(root, request, respond));

    const security = context.get_security_manager();
    security.register_uri_scheme_as_secure(SCHEME);
    security.register_uri_scheme_as_cors_enabled(SCHEME);
}
