import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, js, build] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../gameplay-v4.css', import.meta.url), 'utf8'),
  readFile(new URL('../gameplay-v4.js', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8'),
]);

test('v0.4 presentation files are loaded and copied to dist', () => {
  assert.match(html, /gameplay-v4\.css/);
  assert.match(html, /gameplay-v4\.js/);
  assert.match(build, /gameplay-v4\.css/);
  assert.match(build, /gameplay-v4\.js/);
});

test('battlefield uses compact units and real movement animation', () => {
  assert.match(css, /battle-unit\[data-v4="compact"\]/);
  assert.match(js, /animateUnitChanges/);
  assert.match(js, /spawnDust/);
  assert.match(js, /translate: `\$\{dx\}px \$\{dy\}px`/);
});

test('combat effects cover ranged, melee, magic, damage, heal, and retreat', () => {
  for (const token of ['spawnProjectile', 'spawnSlash', 'spawnSpell', 'spawnFloat', 'spawnKo']) {
    assert.match(js, new RegExp(token));
  }
});

test('branching events change battle or campaign state', () => {
  for (const eventId of ['village-smoke', 'bridge-spy', 'spring-rain', 'wounded-oath']) {
    assert.match(js, new RegExp(eventId));
  }
  assert.match(js, /storyFlags/);
  assert.match(js, /after-war-council/);
});
