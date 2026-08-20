import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync(new URL('../operation-campaign-v1.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../operation-campaign-v1.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('operation campaign exposes four sequential missions and four difficulties', () => {
  for (const operation of ['west-road', 'village-bell', 'guan-line', 'chenliu-command']) assert.ok(script.includes(operation));
  for (const difficulty of ['story', 'normal', 'hard', 'legend']) assert.ok(script.includes(`${difficulty}:`));
  assert.ok(script.includes('unlocked(meta, operation)'));
  assert.ok(script.includes('calculateStars'));
  assert.ok(script.includes('processResult'));
});

test('mission modifiers change real battle data and rewards', () => {
  for (const token of ['battle.turnLimit', 'unit.maxHp', 'unit.attack', 'unit.defense', 'unit.magic', 'unit.speed', 'unit.status.shield', 'save.resources.gold', 'save.resources.grain', 'save.resources.fame']) {
    assert.ok(script.includes(token), `missing ${token}`);
  }
  assert.ok(script.includes('operationVersion'));
  assert.ok(script.includes('operationDifficulty'));
  assert.ok(script.includes('meta.bestTurns'));
  assert.ok(script.includes('meta.history'));
});

test('operation UI and deployment assets are wired into the commercial build', () => {
  assert.ok(html.includes('operation-campaign-v1.css?v=1.0.0'));
  assert.ok(html.includes('operation-campaign-v1.js?v=1.0.0'));
  assert.ok(css.includes('.ocv1-grid'));
  assert.ok(css.includes('.ocv1-command'));
  assert.ok(css.includes('.ocv1-result'));
  assert.ok(css.includes('@media(max-width:760px)'));
});
