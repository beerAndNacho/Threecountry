import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mobile command module exposes selected unit commands without hover', async () => {
  const script = await readFile(new URL('../mobile-command-v1.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../mobile-command-v1.css', import.meta.url), 'utf8');
  assert.match(script, /data-mobile-command-toggle/);
  assert.match(script, /panel\.dataset\.mobileCommand = profile \? 'ready' : 'empty'/);
  assert.match(script, /panel\.dataset\.mobileCollapsed = 'false'/);
  assert.match(script, /command-attack/);
  assert.match(css, /data-mobile-command="ready"\]\[data-mobile-collapsed="false"\]/);
  assert.match(css, /transform:none/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('commercial HTML loads mobile command assets with the current cache version', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /mobile-command-v1\.css\?v=20260819-2/);
  assert.match(html, /mobile-command-v1\.js\?v=20260819-2/);
});
