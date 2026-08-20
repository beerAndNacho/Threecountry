import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { OPERATION_MAPS, OPERATION_MAP_VERSION, validateOperationMaps } from '../operation-map-data.js';

const runtime = fs.readFileSync(new URL('../operation-maps-v1.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../operation-maps-v1.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('four operation maps are valid 12 by 8 battlefields', () => {
  assert.equal(OPERATION_MAP_VERSION, '1.1.0');
  assert.deepEqual(validateOperationMaps(), []);
  assert.equal(Object.keys(OPERATION_MAPS).length, 4);
  for (const [id, map] of Object.entries(OPERATION_MAPS)) {
    assert.equal(map.terrain.length, 8, `${id} row count`);
    assert.ok(map.terrain.every((row) => row.length === 12), `${id} column count`);
    assert.equal(map.terrain[map.objective.y][map.objective.x], 'camp', `${id} objective tile`);
  }
});

test('each operation uses a genuinely different terrain layout and spawn plan', () => {
  const terrainFingerprints = new Set(Object.values(OPERATION_MAPS).map((map) => JSON.stringify(map.terrain)));
  const spawnFingerprints = new Set(Object.values(OPERATION_MAPS).map((map) => JSON.stringify([map.playerSpawns, map.enemySpawns])));
  const weather = new Set(Object.values(OPERATION_MAPS).map((map) => map.weatherId));
  assert.equal(terrainFingerprints.size, 4);
  assert.equal(spawnFingerprints.size, 4);
  assert.equal(weather.size, 4);
});

test('runtime applies terrain objective positions weather and high-difficulty reinforcements', () => {
  for (const token of ['battle.terrain', 'battle.objective', 'repositionUnits', 'operationMapVersion', 'operationWeather', 'applyReinforcements', 'enemy-reinforcement']) {
    assert.ok(runtime.includes(token), `missing ${token}`);
  }
  assert.ok(OPERATION_MAPS['chenliu-command'].reinforcements.difficulties.includes('hard'));
  assert.ok(OPERATION_MAPS['chenliu-command'].reinforcements.difficulties.includes('legend'));
});

test('operation selection cards and deployment preview use real map data', () => {
  for (const token of ['injectOperationThumbnails', 'mapCellsMarkup', 'applyDeploymentPreview', 'updatePreviewTerrain', 'updatePreviewUnits', 'terrainFingerprint', 'spawnFingerprint']) {
    assert.ok(runtime.includes(token), `missing ${token}`);
  }
  assert.ok(css.includes('.omap-thumb'));
  assert.ok(css.includes('grid-template-columns:repeat(12,1fr)'));
  assert.ok(css.includes('grid-template-rows:repeat(8,1fr)'));
  assert.ok(css.includes('.preview-grid[data-operation-weather'));
});

test('commercial HTML and responsive CSS load operation battlefield assets', () => {
  assert.ok(html.includes('operation-maps-v1.css?v=1.2.0'));
  assert.ok(html.includes('operation-maps-v1.js?v=1.2.0'));
  assert.ok(css.includes('[data-operation-weather="mist"]'));
  assert.ok(css.includes('[data-operation-weather="rain"]'));
  assert.ok(css.includes('[data-operation-weather="wind"]'));
  assert.ok(css.includes('[data-operation-weather="ember"]'));
  assert.ok(css.includes('@media(max-width:720px)'));
});
