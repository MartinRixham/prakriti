import { BindingRoot } from './lib/datum/Datum.js';
import { Application } from './lib/application.js';
import { Window } from './lib/window.js';
import { HeaderBar } from './lib/header-bar.js';

new BindingRoot(
    new Application(
        new Window(new HeaderBar("App"))));
