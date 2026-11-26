import { assert, suite, test } from '../harness.js';
import { Desktop, rgbaToHex } from '../../src/launcher/desktop.js';
import { fakeGObject } from './fakes.js';

suite('launcher/desktop');

const BLUE = { red: 0x35 / 255, green: 0x84 / 255, blue: 0xe4 / 255, alpha: 1 };

function fakeStyle({ dark = false, accents = true, accent = BLUE } = {}) {
    return fakeGObject({
        dark,
        system_supports_accent_colors: accents,
        get_accent_color_rgba: () => accent,
    });
}

const fakeSettings = (layout = 'appmenu:close') => fakeGObject({ gtk_decoration_layout: layout });

test('rgbaToHex gives #rrggbb', () => {
    assert.equal(rgbaToHex(BLUE), '#3584e4');
    assert.equal(rgbaToHex({ red: 0, green: 0, blue: 0 }), '#000000');
    assert.equal(rgbaToHex({ red: 1, green: 1, blue: 1 }), '#ffffff');
});

test('rgbaToHex rounds to the nearest step', () => {
    assert.equal(rgbaToHex({ red: 0.5, green: 0.499, blue: 0.002 }), '#807f01');
});

test('rgbaToHex clamps out-of-range channels', () => {
    assert.equal(rgbaToHex({ red: 1.5, green: -0.2, blue: 0.5 }), '#ff0080');
});

test('dark follows the style manager', () => {
    const style = fakeStyle({ dark: true });
    const desktop = new Desktop(style, fakeSettings());
    assert.equal(desktop.dark, true);
    style.dark = false;
    assert.equal(desktop.dark, false);
});

test('dark is a boolean', () => {
    assert.equal(new Desktop(fakeStyle({ dark: undefined }), fakeSettings()).dark, false);
    assert.equal(new Desktop(fakeStyle({ dark: 1 }), fakeSettings()).dark, true);
});

test('accent is the system accent as hex', () => {
    assert.equal(new Desktop(fakeStyle(), fakeSettings()).accent, '#3584e4');
});

test('accent is empty where the system has no accent colours', () => {
    const desktop = new Desktop(fakeStyle({ accents: false }), fakeSettings());
    assert.equal(desktop.accent, '');
});

test('buttonLayout follows GTK\'s decoration layout', () => {
    const settings = fakeSettings('close,minimize:');
    const desktop = new Desktop(fakeStyle(), settings);
    assert.equal(desktop.buttonLayout, 'close,minimize:');
    settings.gtk_decoration_layout = ':close';
    assert.equal(desktop.buttonLayout, ':close');
});

test('buttonLayout is empty when GTK has none', () => {
    assert.equal(new Desktop(fakeStyle(), fakeSettings(null)).buttonLayout, '');
});

test('onChange watches everything the style is made of', () => {
    const style = fakeStyle();
    const settings = fakeSettings();
    new Desktop(style, settings).onChange(() => {});
    assert.deepEqual(style.connected().sort(),
        ['notify::accent-color', 'notify::dark', 'notify::system-supports-accent-colors']);
    assert.deepEqual(settings.connected(), ['notify::gtk-decoration-layout']);
});

test('onChange calls back with the desktop on each change', () => {
    const style = fakeStyle();
    const settings = fakeSettings();
    const desktop = new Desktop(style, settings);
    const seen = [];
    desktop.onChange((d) => seen.push(d));

    style.emit('notify::dark');
    style.emit('notify::accent-color');
    style.emit('notify::system-supports-accent-colors');
    settings.emit('notify::gtk-decoration-layout');

    assert.equal(seen.length, 4);
    assert.ok(seen.every((d) => d === desktop));
});

test('onChange sees the new values', () => {
    const style = fakeStyle();
    const desktop = new Desktop(style, fakeSettings());
    let dark;
    desktop.onChange((d) => { dark = d.dark; });
    style.dark = true;
    style.emit('notify::dark');
    assert.equal(dark, true);
});
