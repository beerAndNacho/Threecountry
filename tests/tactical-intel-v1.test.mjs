import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const js = await readFile(new URL('../tactical-intel-v1.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../tactical-intel-v1.css', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('tactical intel module includes actual player-facing analysis tools', () => {
  for (const marker of ['threat-overlay','terrain-labels','compact-units','hud-density','officer-codex','selected-unit-dossier']) {
    assert.match(js, new RegExp(marker));
  }
  assert.match(js, /dataset\.threat/);
  assert.match(js, /전투 의지/);
  assert.match(js, /현재 장비/);
});

test('commercial alpha loads the character and tactical layers after prior combat modules', () => {
  const combat = index.indexOf('commercial-combat-v3.js');
  const art = index.indexOf('commercial-character-v4.js');
  const intel = index.indexOf('tactical-intel-v1.js');
  assert.ok(combat >= 0 && art > combat && intel > art);
  assert.match(index, /commercial-character-v4\.css/);
  assert.match(index, /tactical-intel-v1\.css/);
});

test('tactical css is responsive and preserves small battlefield units', () => {
  assert.match(css, /tiv1-compact-units/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /battle-cell\[data-threat/);
  assert.match(css, /tiv1-unit-inspector/);
});
