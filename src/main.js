#!/usr/bin/env -S gjs -m

import Gio from 'gi://Gio';
import System from 'system';

import { run } from './launcher/application.js';

const ICON_DIR = '/usr/share/icons/Adwaita/symbolic';

Gio._promisify(Gio.File.prototype, 'load_contents_async');

const here = Gio.File.new_for_uri(import.meta.url).get_parent();

export const api = {
    icon: async ({ file }) => {
        if (typeof file !== 'string' || file.split('/').includes('..')) {
            throw new Error(`Bad icon path: ${file}`);
        }

        const [bytes] = await Gio.File.new_for_path(`${ICON_DIR}/${file}`).load_contents_async(null);
        const svg = new TextDecoder().decode(bytes);

        return svg.replace(/\s(fill|width|height)="[^"]*"/g, '');
    },
};

const status = run({
    id: 'org.example.App',
    title: 'App',
    width: 1000,
    height: 680,
    frontend: here.get_child('frontend'),
    api,
});

System.exit(status);
