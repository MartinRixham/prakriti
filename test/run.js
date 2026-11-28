import './frontend/lib/window.test.js';
import './frontend/lib/close.test.js';
import './frontend/lib/minimize.test.js';
import './frontend/lib/maximize.test.js';

import './frontend/app-header.test.js';

import './launcher/paths.test.js';
import './launcher/colour.test.js';
import './launcher/desktop.test.js';
import './launcher/window-controller.test.js';
import './launcher/popup-session.test.js';
import './launcher/popups.test.js';
import './launcher/bridge.test.js';
import './launcher/messaging.test.js';
import './launcher/webview.test.js';
import './launcher/icons.test.js';

import { run } from './harness.js';

await run(ARGV[0] ?? '');
