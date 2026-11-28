import GLib from 'gi://GLib';

import { afterAll, assert, suite, test } from '../harness.js';
import { iconApi } from '../../src/launcher/icons.js';

suite('launcher/icons');

const dir = GLib.dir_make_tmp('prakriti-icons-XXXXXX');
GLib.file_set_contents(`${dir}/go-home-symbolic.svg`,
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill="#222" d="M0 0"/></svg>');
afterAll(() => {
    GLib.unlink(`${dir}/go-home-symbolic.svg`);
    GLib.rmdir(dir);
});

const icon = iconApi(dir);

test('icon gives the SVG without fill, width and height', async () => {
    assert.equal(await icon('go-home-symbolic.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>');
});

test('icon refuses paths that leave the icon directory', async () => {
    await assert.rejects(() => icon('../secret.svg'));
    await assert.rejects(() => icon('a/../../b.svg'));
});

test('icon refuses a file that is not a string', async () => {
    await assert.rejects(() => icon(undefined));
});
