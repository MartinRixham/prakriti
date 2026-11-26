// Runs every test: gjs -m test/run.js [filter]
// The filter, if given, keeps the tests whose "suite: name" contains it.
// No display needed: nothing here loads GTK or WebKit.

import './frontend/lib/window.test.js';
import './frontend/lib/close.test.js';
import './frontend/lib/minimize.test.js';
import './frontend/lib/maximize.test.js';

import './launcher/protocol.test.js';
import './launcher/paths.test.js';
import './launcher/desktop.test.js';
import './launcher/window-controller.test.js';
import './launcher/popups.test.js';
import './launcher/bridge.test.js';
import './launcher/messaging.test.js';
import './launcher/scheme.test.js';

import { run } from './harness.js';

await run(ARGV[0] ?? '');
