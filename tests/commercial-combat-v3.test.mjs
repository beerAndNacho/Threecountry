import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptUrl = new URL('../commercial-combat-v3.js', import.meta.url);
const cssUrl = new URL('../commercial-combat-v3.css', import.meta.url);
const script = await readFile(scriptUrl, 'utf8');
const css = await readFile(cssUrl, 'utf8');

test('commercial combat v3 is valid JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', scriptUrl.pathname], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('movement uses visible intermediate frames rather than teleporting', () => {
  assert.match(script, /pathFrames/);
  assert.match(script, /steps=7/);
  assert.match(script, /dx\*progress/);
  assert.match(script, /dustAt/);
  assert.match(script, /animationFrames:8/);
});

test('combat choreography differentiates weapons and feedback', () => {
  for (const effect of ['slash','thrust','arrow','rune','hitstop','camera-shake','damage-number','counter','skill-cutin','phase-banner']) {
    assert.match(script, new RegExp(effect.replace('-', '\\-')));
  }
  for (const style of ['sword','spear','heavy','shield','dual','guandao']) assert.match(script, new RegExp(`style:'${style}'`));
  assert.match(css, /ccv3-skill-cutin/);
  assert.match(css, /ccv3-number/);
  assert.match(css, /ccv3-hitstop/);
  assert.match(css, /ccv3-shake/);
});

test('battlefield units are compact while retaining a larger selected state', () => {
  assert.match(css, /width:56%!important/);
  assert.match(css, /width:68%!important/);
  assert.match(css, /width:49%!important/);
  assert.match(css, /ccv3-overview/);
});

test('combat runtime exposes measurable quality metadata', () => {
  assert.match(script, /__commercialCombatV3/);
  assert.match(script, /frameSamples/);
  assert.match(script, /metrics:/);
  assert.match(script, /reducedFx/);
});
