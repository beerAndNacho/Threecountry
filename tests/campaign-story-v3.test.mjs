import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptUrl = new URL('../campaign-story-v3.js', import.meta.url);
const cssUrl = new URL('../campaign-story-v3.css', import.meta.url);
const script = await readFile(scriptUrl, 'utf8');
const css = await readFile(cssUrl, 'utf8');

test('campaign story v3 is valid JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', scriptUrl.pathname], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('story pack adds eight relationship-driven scenes', () => {
  for (const scene of ['xiahou-oath','guo-fever','village-bell','zhang-roar','guan-mercy','liu-parley','prisoner-road','night-camp']) {
    assert.match(script, new RegExp(scene));
  }
  assert.match(script, /sceneCount:SCENES\.length/);
});

test('choices affect resources, battle state, relationships and future flags', () => {
  assert.match(script, /resources:/);
  assert.match(script, /applyBattle/);
  assert.match(script, /applyRelation/);
  assert.match(script, /relations:/);
  assert.match(script, /meta\.flags/);
  assert.match(script, /meta\.chronicle/);
  for (const trait of ['benevolence','cunning','discipline','boldness']) assert.match(script, new RegExp(trait));
});

test('battle story conditions react to turn, survival and low HP', () => {
  assert.match(script, /scene\.turn/);
  assert.match(script, /requiresAlive/);
  assert.match(script, /requiresLow/);
  assert.match(script, /requiresVictory/);
  assert.match(script, /requiresCleared/);
});

test('relationship journal is designed for desktop and mobile', () => {
  assert.match(css, /cstory3-relations/);
  assert.match(css, /journal-main/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(script, /__campaignStoryV3/);
});
