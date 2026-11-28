import { assert, suite, test } from '../harness.js';
import { Page } from '../page.js';
import { popupInitScript } from '../../src/launcher/popup.js';

suite('launcher/popup');

test('popupInitScript gives the popup its id and data', () => {
    const page = new Page();
    page.run(popupInitScript('main-menu', { sections: [['A']], dark: true }));
    assert.deepEqual(page.get('__appPopup'), { id: 'main-menu', data: { sections: [['A']], dark: true } });
});

test('popupInitScript gives null for no data', () => {
    const page = new Page();
    page.run(popupInitScript('p'));
    assert.deepEqual(page.get('__appPopup'), { id: 'p', data: null });
});
