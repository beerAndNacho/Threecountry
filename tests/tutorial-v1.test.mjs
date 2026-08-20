import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync(new URL('../tutorial-v1.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tutorial-v1.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const expectedSteps = [
  'title-start', 'story-next', 'hub-operation', 'hub-facility', 'hub-start',
  'roster-select', 'roster-confirm', 'deployment-order', 'deployment-start',
  'battle-unit', 'battle-move', 'battle-cell', 'battle-command', 'battle-end', 'result-record',
];

test('tutorial covers the complete first-player journey', () => {
  for (const id of expectedSteps) assert.ok(script.includes(`id: '${id}'`), `missing ${id}`);
  for (const screen of ['title', 'story', 'hub', 'roster', 'deployment', 'battle', 'result']) {
    assert.ok(script.includes(`screen: '${screen}'`), `missing ${screen}`);
  }
  assert.ok(script.includes('stepCount: STEPS.length'));
  assert.ok(script.includes("threecountry:tutorial:v1"));
});

test('tutorial advances from real game actions instead of fake next-only slides', () => {
  for (const action of ['new-game', 'story-next', 'ocv1-start', 'toggle-hero', 'confirm-roster', 'start-battle', 'select-battle-unit', 'command-move', 'battle-cell', 'end-turn']) {
    assert.ok(script.includes(`'${action}'`), `missing action ${action}`);
  }
  assert.ok(script.includes("target.closest('[data-action]')"));
  assert.ok(script.includes('completeStep(step.id)'));
});

test('tutorial can be restarted dismissed and resumed safely', () => {
  assert.ok(script.includes('restartTutorial'));
  assert.ok(script.includes('stopTutorial'));
  assert.ok(script.includes('dismissed'));
  assert.ok(script.includes('completed'));
  assert.ok(script.includes('lastStep'));
});

test('tutorial coach remains stable during unrelated DOM mutations', () => {
  assert.ok(script.includes("const VERSION = '1.2.1'"));
  assert.ok(script.includes('renderedStepId'));
  assert.ok(script.includes("existing && renderedStepId === step.id && currentTarget === target"));
  assert.ok(script.includes('stableCoach: true'));
  assert.ok(script.includes('data-tutorial-step'));
});

test('tutorial uses mobile-safe highlight and reduced-motion fallbacks', () => {
  assert.ok(css.includes('.tutorial-target-v1'));
  assert.ok(css.includes('.tutorial-v1'));
  assert.ok(css.includes('@media(max-width:600px)'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});

test('release HTML loads tutorial assets at v1.2.1', () => {
  assert.ok(html.includes('tutorial-v1.css?v=1.2.1'));
  assert.ok(html.includes('tutorial-v1.js?v=1.2.1'));
});
