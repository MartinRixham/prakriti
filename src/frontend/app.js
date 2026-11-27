import { BindingRoot } from './lib/datum/Datum.js';
import { Application } from './lib/application.js';
import { Window } from './lib/window.js';

import { AppHeader } from './app-header.js'

new BindingRoot(
    new Application(
        new Window(new AppHeader())));
