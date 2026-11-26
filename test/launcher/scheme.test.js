// serveRequest and registerScheme (src/launcher/scheme.js) against real
// files, with a fake WebKitURISchemeRequest.

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { ORIGIN, SCHEME, registerScheme, serveRequest } from '../../src/launcher/scheme.js';
import { afterAll, assert, suite, test } from '../harness.js';

suite('launcher/scheme');

// A frontend directory, and a secret beside it that must stay out of reach.
const base = Gio.File.new_for_path(GLib.dir_make_tmp('launcher-scheme-XXXXXX'));
const root = base.get_child('frontend');

function write(file, text) {
    try {
        file.get_parent().make_directory_with_parents(null);
    }
    catch (e) {
        if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS)) throw e;
    }
    file.replace_contents(new TextEncoder().encode(text), null, false, Gio.FileCreateFlags.NONE, null);
}

write(root.get_child('index.html'), '<!DOCTYPE html><title>Home</title>');
write(root.resolve_relative_path('lib/app.js'), 'export const x = 1;');
write(root.resolve_relative_path('lib/icon.svg'), '<svg/>');
write(root.resolve_relative_path('lib/my page.html'), '<p>spaced</p>');
write(root.get_child('notes.txt'), 'plain words');
write(base.get_child('secret.txt'), 'top secret');

afterAll(() => {
    const remove = (file) => {
        if (file.query_file_type(Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null) === Gio.FileType.DIRECTORY) {
            const children = file.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
            for (let info; (info = children.next_file(null));) remove(file.get_child(info.get_name()));
        }
        file.delete(null);
    };
    remove(base);
});

// What a request was answered with, its stream read out.
function answered({ status, reason, type, stream, size }) {
    const bytes = stream.read_bytes(1 << 20, null).toArray();
    stream.close(null);
    return { status, reason, type, size, text: new TextDecoder().decode(bytes) };
}

// Serve `path` and settle with what the request was answered with.
function request(path) {
    return new Promise((resolve) => {
        const req = { get_path: () => path };
        serveRequest(root, req, (r, response) => {
            assert.equal(r, req);
            resolve(answered(response));
        });
    });
}

test('the root serves index.html', async () => {
    const answer = await request('/');
    assert.equal(answer.status, 200);
    assert.equal(answer.reason, 'OK');
    assert.equal(answer.text, '<!DOCTYPE html><title>Home</title>');
    assert.equal(answer.type, 'text/html');
    assert.equal(answer.size, answer.text.length);
});

test('files are served with their type and size', async () => {
    const script = await request('/lib/app.js');
    assert.equal(script.text, 'export const x = 1;');
    assert.equal(script.type, 'text/javascript');
    assert.equal(script.size, 19);

    const svg = await request('/lib/icon.svg');
    assert.equal(svg.type, 'image/svg+xml');
});

test('types the launcher does not know come from Gio', async () => {
    const answer = await request('/notes.txt');
    assert.equal(answer.text, 'plain words');
    assert.equal(answer.type, 'text/plain');
});

test('percent-encoded paths are decoded', async () => {
    const answer = await request('/lib/my%20page.html');
    assert.equal(answer.text, '<p>spaced</p>');
});

test('a missing file is a plain-text 404', async () => {
    const answer = await request('/missing.html');
    assert.equal(answer.status, 404);
    assert.equal(answer.reason, 'Not Found');
    assert.equal(answer.type, 'text/plain');
    assert.ok(answer.text.length > 0);
    assert.equal(answer.size, new TextEncoder().encode(answer.text).length);
});

test('a directory is not served', async () => {
    assert.equal((await request('/lib/')).status, 404);
});

test('.. cannot reach outside the frontend', async () => {
    for (const path of ['/../secret.txt', '/lib/../../secret.txt', '/%2e%2e/secret.txt', '/..%2Fsecret.txt']) {
        const answer = await request(path);
        assert.equal(answer.status, 403, `${path}: ${answer.text}`);
        assert.ok(!answer.text.includes('top secret'), path);
    }
});

test('an undecodable path is refused', async () => {
    assert.equal((await request('/%E0%A4%A')).status, 403);
});

test('registerScheme serves app:// and marks it secure and CORS-enabled', async () => {
    const registered = {};
    const security = [];
    let answer;
    const answered$ = new Promise((resolve) => { answer = resolve; });
    registerScheme({
        register_uri_scheme(scheme, fn) { registered[scheme] = fn; },
        get_security_manager: () => ({
            register_uri_scheme_as_secure: (s) => security.push(['secure', s]),
            register_uri_scheme_as_cors_enabled: (s) => security.push(['cors', s]),
        }),
    }, root, (_request, response) => answer(answered(response)));

    assert.equal(SCHEME, 'app');
    assert.equal(ORIGIN, 'app://main');
    assert.deepEqual(Object.keys(registered), ['app']);
    assert.deepEqual(security, [['secure', 'app'], ['cors', 'app']]);

    registered.app({ get_path: () => '/lib/icon.svg' });
    assert.deepEqual(await answered$,
        { status: 200, reason: 'OK', type: 'image/svg+xml', size: 6, text: '<svg/>' });
});
