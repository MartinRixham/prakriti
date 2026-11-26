import { assert, suite, test } from '../harness.js';
import { appPath, contentTypeFor, isPopupPage, resolvePage } from '../../src/launcher/paths.js';

suite('launcher/paths');

test('contentTypeFor knows the frontend\'s file types', () => {
    assert.equal(contentTypeFor('index.html'), 'text/html');
    assert.equal(contentTypeFor('app.js'), 'text/javascript');
    assert.equal(contentTypeFor('mod.mjs'), 'text/javascript');
    assert.equal(contentTypeFor('style.css'), 'text/css');
    assert.equal(contentTypeFor('data.json'), 'application/json');
    assert.equal(contentTypeFor('icon.svg'), 'image/svg+xml');
    assert.equal(contentTypeFor('icon.png'), 'image/png');
    assert.equal(contentTypeFor('photo.jpg'), 'image/jpeg');
    assert.equal(contentTypeFor('photo.jpeg'), 'image/jpeg');
    assert.equal(contentTypeFor('photo.webp'), 'image/webp');
    assert.equal(contentTypeFor('font.woff2'), 'font/woff2');
});

test('contentTypeFor ignores the extension\'s case', () => {
    assert.equal(contentTypeFor('INDEX.HTML'), 'text/html');
    assert.equal(contentTypeFor('Icon.Svg'), 'image/svg+xml');
});

test('contentTypeFor goes by the last extension', () => {
    assert.equal(contentTypeFor('bundle.min.js'), 'text/javascript');
    assert.equal(contentTypeFor('archive.tar.gz'), null);
});

test('contentTypeFor gives null where it does not know', () => {
    assert.equal(contentTypeFor('README'), null);
    assert.equal(contentTypeFor('notes.txt'), null);
    assert.equal(contentTypeFor('trailing.'), null);
    // A dot in a directory name is not an extension.
    assert.equal(contentTypeFor('lib.d/README'), null);
});

test('appPath serves index.html for the root', () => {
    assert.equal(appPath('/'), 'index.html');
    assert.equal(appPath(''), 'index.html');
    assert.equal(appPath(null), 'index.html');
    assert.equal(appPath(undefined), 'index.html');
    assert.equal(appPath('/./'), 'index.html');
});

test('appPath gives the path relative to the frontend', () => {
    assert.equal(appPath('/index.html'), 'index.html');
    assert.equal(appPath('/lib/html/window.html'), 'lib/html/window.html');
});

test('appPath tidies empty and . segments', () => {
    assert.equal(appPath('//lib//style.css'), 'lib/style.css');
    assert.equal(appPath('/./lib/./style.css'), 'lib/style.css');
    assert.equal(appPath('/lib/'), 'lib');
});

test('appPath decodes percent-encoding', () => {
    assert.equal(appPath('/my%20page.html'), 'my page.html');
    assert.equal(appPath('/caf%C3%A9.css'), 'café.css');
});

test('appPath refuses to go up', () => {
    assert.equal(appPath('/../secret'), null);
    assert.equal(appPath('/lib/../../secret'), null);
    // Even when it would stay inside: there's no call for it.
    assert.equal(appPath('/lib/../index.html'), null);
    assert.equal(appPath('..'), null);
});

test('appPath refuses .. hidden by encoding', () => {
    assert.equal(appPath('/%2e%2e/secret'), null);
    assert.equal(appPath('/%2E%2E%2Fsecret'), null);
    assert.equal(appPath('/lib%2F..%2F..%2Fsecret'), null);
});

test('appPath refuses backslashes and NULs', () => {
    assert.equal(appPath('/..\\secret'), null);
    assert.equal(appPath('/lib%5C..%5Csecret'), null);
    assert.equal(appPath('/index.html%00.png'), null);
});

test('appPath refuses what cannot be decoded', () => {
    assert.equal(appPath('/%E0%A4%A'), null);
    assert.equal(appPath('/%zz'), null);
});

test('isPopupPage takes plain relative paths', () => {
    assert.ok(isPopupPage('lib/html/menu-popup.html'));
    assert.ok(isPopupPage('menu.html'));
    assert.ok(isPopupPage('my-popup_2.html'));
    assert.ok(isPopupPage('a..b.html'));
});

test('isPopupPage refuses paths that leave the directory', () => {
    assert.ok(!isPopupPage('../menu.html'));
    assert.ok(!isPopupPage('lib/../../menu.html'));
    assert.ok(!isPopupPage('lib/..'));
    assert.ok(!isPopupPage('/etc/passwd'));
});

test('isPopupPage refuses . segments', () => {
    assert.ok(!isPopupPage('./menu.html'));
    assert.ok(!isPopupPage('lib/./menu.html'));
});

test('isPopupPage refuses URLs and odd characters', () => {
    assert.ok(!isPopupPage('https://example.com/x.html'));
    assert.ok(!isPopupPage('javascript:alert(1)'));
    assert.ok(!isPopupPage('menu.html?x=1'));
    assert.ok(!isPopupPage('menu.html#top'));
    assert.ok(!isPopupPage('my menu.html'));
    assert.ok(!isPopupPage('lib\\menu.html'));
    assert.ok(!isPopupPage('menu%2ehtml'));
});

test('isPopupPage refuses what is not a non-empty string', () => {
    assert.ok(!isPopupPage(''));
    assert.ok(!isPopupPage(undefined));
    assert.ok(!isPopupPage(null));
    assert.ok(!isPopupPage(42));
    assert.ok(!isPopupPage(['menu.html']));
});

test('resolvePage puts the page beside its opener', () => {
    assert.equal(resolvePage('app://main/index.html', 'lib/html/menu-popup.html'),
        'app://main/lib/html/menu-popup.html');
    assert.equal(resolvePage('app://main/sub/page.html', 'menu.html'), 'app://main/sub/menu.html');
});

test('resolvePage ignores the opener\'s query and fragment', () => {
    assert.equal(resolvePage('app://main/index.html?a=/b/c#d/e', 'menu.html'), 'app://main/menu.html');
    assert.equal(resolvePage('app://main/x/index.html#/route/deep', 'menu.html'), 'app://main/x/menu.html');
});

test('resolvePage works from a directory URI', () => {
    assert.equal(resolvePage('app://main/', 'menu.html'), 'app://main/menu.html');
});
