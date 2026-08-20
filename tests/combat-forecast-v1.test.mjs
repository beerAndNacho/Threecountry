import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const js = await readFile(new URL('../combat-forecast-v1.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../combat-forecast-v1.css', import.meta.url), 'utf8');

test('forecast communicates the six decisions needed before an attack', () => {
  for (const text of ['예상 피해','명중률','치명타','병종 우세','지형','반격 가능']) assert.match(js, new RegExp(text));
  for (const metric of ['damage-range','hit-rate','critical-rate','class-matchup','terrain-defense','counter']) assert.match(js, new RegExp(metric));
});

test('forecast considers class matchup, terrain defense, evade, range and speed', () => {
  for (const token of ['classMod','terrainOf','defenderTerrain?.defense','defenderTerrain?.evade','rangeOf','attacker.speed - defender.speed']) assert.match(js, new RegExp(token.replace(/[?.]/g, (c)=>`\\${c}`)));
});

test('forecast is mobile safe and dismissible', () => {
  assert.match(js, /data-cf1-close/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(css, /calc\(100vw - 18px\)/);
  assert.match(css, /@media\(max-width:480px\)/);
});
