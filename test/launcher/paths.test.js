import { assert, suite, test } from '../harness.js';
import { isPopupPage, resolvePage } from '../../src/launcher/paths.js';

suite('launcher/paths');

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
