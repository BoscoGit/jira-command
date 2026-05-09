#!/usr/bin/env node
import { runRootSafe } from './commands/root.js';
import { installSigintHandler } from './signal.js';

installSigintHandler();

const exitCode = await runRootSafe(process.argv.slice(2));
process.exit(exitCode);
