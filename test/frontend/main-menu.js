import { assert, suite, test } from '../harness.js';
import { MainMenu } from '../../src/frontend/main-menu.js';

suite('frontend/main-menu');

test('Close app from main menu', async () => {

    let closed = false;

    globalThis.app = {
        win: {
            close() {
                closed = true;
            }
        }
    }

    const menu = new MainMenu();

    menu.activate([1, 1])

    assert.ok(closed);
});
