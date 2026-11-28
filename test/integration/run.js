// The integration tests, for gjs under a display: test/integration/run.sh
// runs them in a headless mutter.

import Gtk from 'gi://Gtk?version=4.0';

import './popup.test.js';
import './window.test.js';

import { run } from '../harness.js';

Gtk.init();

await run(ARGV[0] ?? '');
