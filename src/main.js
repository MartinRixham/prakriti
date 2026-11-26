#!/usr/bin/env -S gjs -m

import System from 'system';
import { run } from './launcher/application.js';

const status = run({ id: 'org.example.App' });

System.exit(status);
