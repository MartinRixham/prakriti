import { assert, suite, test } from '../harness.js';
import { rgbaToHex } from '../../src/launcher/colour.js';

suite('launcher/colour');

test('rgbaToHex gives #rrggbb', () => {
    assert.equal(rgbaToHex({ red: 0x35 / 255, green: 0x84 / 255, blue: 0xe4 / 255, alpha: 1 }), '#3584e4');
    assert.equal(rgbaToHex({ red: 0, green: 0, blue: 0 }), '#000000');
    assert.equal(rgbaToHex({ red: 1, green: 1, blue: 1 }), '#ffffff');
});

test('rgbaToHex rounds to the nearest step', () => {
    assert.equal(rgbaToHex({ red: 0.5, green: 0.499, blue: 0.002 }), '#807f01');
});

test('rgbaToHex clamps out-of-range channels', () => {
    assert.equal(rgbaToHex({ red: 1.5, green: -0.2, blue: 0.5 }), '#ff0080');
});
