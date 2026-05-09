import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

describe('VERSION', () => {
  it('coincide com package.json#version', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('é string não-vazia', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
