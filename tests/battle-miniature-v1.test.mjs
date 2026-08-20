import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const js = await readFile(new URL('../battle-miniature-v1.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../battle-miniature-v1.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index-v15.html', import.meta.url), 'utf8');

test('battlefield miniature layer exposes eight visible animation states', () => {
  for (const state of ['idle','walk','attack','skill','hit','guard','victory','retreat']) {
    assert.match(js, new RegExp(`['\"]${state}['\"]`));
    assert.match(css, new RegExp(`data-state=\\?['\"]${state}`));
  }
});

test('miniatures separate body, face, armor, headgear and weapon geometry', () => {
  for (const token of ['bm1-head','bm1-torso','bm1-headgear','bm1-weapon','bm1-leg-left','bm1-leg-right']) assert.match(js, new RegExp(token));
  for (const weapon of ['sword','spear','guandao','halberd','shield','fan','scroll','bow']) assert.match(js, new RegExp(`case ['\"]${weapon}`));
});

test('v1.5 entry loads miniature and forecast layers without replacing stable index', () => {
  assert.match(html, /battle-miniature-v1\.js/);
  assert.match(html, /combat-forecast-v1\.js/);
  assert.match(html, /fetch\('\.\/index\.html'/);
});
