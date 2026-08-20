import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { HEROES } from '../content.js';
import { CHAPTER_TWO_MAPS, CHAPTER_TWO_OPERATIONS, CHAPTER_TWO_VERSION, validateChapterTwo } from '../chapter-two-content-v1.js';

const campaign = fs.readFileSync(new URL('../chapter-two-campaign-v1.js', import.meta.url), 'utf8');
const art = fs.readFileSync(new URL('../chapter-two-art-v1.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chapter-two-v1.css', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('chapter two contains four sequential operations and six new units', () => {
  assert.equal(CHAPTER_TWO_VERSION, '1.3.0');
  assert.equal(CHAPTER_TWO_OPERATIONS.length, 4);
  assert.deepEqual(CHAPTER_TWO_OPERATIONS.map((operation) => operation.chapter), ['2-1', '2-2', '2-3', '2-4']);
  for (const id of ['huaxiong', 'jiaxu', 'lubu', 'dongzhuo', 'soldier-xiliang', 'soldier-crossbow']) {
    assert.ok(HEROES[id], `missing chapter two hero ${id}`);
  }
});

test('all Luoyang maps are unique valid 12x8 tactical layouts', () => {
  assert.deepEqual(validateChapterTwo(), []);
  const maps = Object.values(CHAPTER_TWO_MAPS);
  assert.equal(maps.length, 4);
  assert.equal(new Set(maps.map((map) => JSON.stringify(map.terrain))).size, 4);
  assert.equal(new Set(maps.map((map) => JSON.stringify([map.playerSpawns, map.enemySpawns]))).size, 4);
  for (const map of maps) {
    assert.equal(map.terrain.length, 8);
    assert.ok(map.terrain.every((row) => row.length === 12));
    assert.equal(map.terrain[map.objective.y][map.objective.x], 'camp');
    assert.ok(map.enemySpawns.some((spawn) => spawn.leader));
  }
});

test('chapter two bypasses chapter one reward and map processors', () => {
  assert.match(campaign, /operationVersion = BASE_OPERATION_VERSION/);
  assert.match(campaign, /operationMapVersion = BASE_MAP_VERSION/);
  assert.match(campaign, /operationId = ''/);
  assert.match(campaign, /chapterTwoId/);
  assert.match(campaign, /chapterTwoOperation/);
});

test('boss phases, briefings and persistent rewards are implemented', () => {
  for (const token of ['gateShield', 'poisonFog', 'unmatched', 'reinforced', 'tyrantShieldTurn']) assert.match(campaign, new RegExp(token));
  for (const operation of CHAPTER_TWO_OPERATIONS) assert.match(campaign, new RegExp(`'${operation.id}'`));
  assert.match(campaign, /meta\.processed/);
  assert.match(campaign, /save\.chapterTwoCleared = true/);
  assert.match(campaign, /save\.resources\.gold/);
  assert.match(campaign, /calculateStars/);
});

test('new bosses have separate art silhouettes and mobile campaign UI', () => {
  for (const name of ['화웅', '가후', '여포', '동탁', '서량기병', '연노병']) assert.match(art, new RegExp(name));
  for (const token of ['gate', 'hood', 'plume', 'crown', 'halberd', 'shield', 'bow']) assert.match(art, new RegExp(token));
  assert.match(css, /c2v1-grid/);
  assert.match(css, /c2v1-modal/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test('HTML loads chapter two before chapter one processors', () => {
  const chapter = index.indexOf('chapter-two-campaign-v1.js');
  const chapterOne = index.indexOf('operation-campaign-v1.js');
  const maps = index.indexOf('operation-maps-v1.js');
  assert.ok(chapter > 0 && chapter < chapterOne && chapter < maps);
  assert.match(index, /chapter-two-art-v1\.js\?v=1\.3\.0/);
  assert.match(index, /chapter-two-v1\.css\?v=1\.3\.0/);
  assert.match(index, /Luoyang Campaign Alpha v1\.3\.0/);
});
