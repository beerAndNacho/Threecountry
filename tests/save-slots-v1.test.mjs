import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  SAVE_SLOT_COUNT, createArchive, createSlot, emptySlotsState, normalizeSlotsState,
  snapshotChecksum, summarizeSnapshot, validateArchive,
} from '../save-slots-core.js';

const runtime = fs.readFileSync(new URL('../save-slots-v1.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../save-slots-v1.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const snapshot = {
  'threecountry:srpg:v2': JSON.stringify({
    screen: 'hub', resources: { gold: 810, grain: 630, fame: 24 },
    records: { victories: 2, defeats: 1 }, operation: { id: 'village-bell', difficulty: 'hard' },
  }),
  'threecountry:commercial:v1': JSON.stringify({ progression: { cao: { level: 3 }, xiahou: { level: 2 } } }),
  'threecountry:operation-campaign:v1': JSON.stringify({ selected: 'village-bell', cleared: { 'west-road': true }, stars: { 'west-road': 3 } }),
  'threecountry:story-director:v2': JSON.stringify({ completed: { 'war-council': 'scout' } }),
  'threecountry:campaign-story:v3': JSON.stringify({ completed: { 'founding-oath': 'trust' } }),
};

test('save slot core creates three independent slots and useful summaries', () => {
  assert.equal(SAVE_SLOT_COUNT, 3);
  const state = emptySlotsState(1000);
  assert.equal(state.slots.length, 3);
  const slot = createSlot({ id: 2, name: '난세 기록', snapshot, now: 2000, playSeconds: 3720 });
  assert.equal(slot.id, 2);
  assert.equal(slot.checksum, snapshotChecksum(snapshot));
  assert.equal(slot.summary.operationId, 'village-bell');
  assert.equal(slot.summary.difficulty, 'hard');
  assert.equal(slot.summary.cleared, 1);
  assert.equal(slot.summary.stars, 3);
  assert.equal(slot.summary.storyChoices, 2);
  assert.equal(slot.summary.averageLevel, 2.5);
  assert.deepEqual(summarizeSnapshot(snapshot), slot.summary);
});

test('export archive validates and checksum tampering is rejected', () => {
  const state = emptySlotsState(1000);
  state.activeSlot = 2;
  state.slots[1] = createSlot({ id: 2, name: '난세 기록', snapshot, now: 2000 });
  const archive = createArchive(state, 3000);
  const validated = validateArchive(archive);
  assert.equal(validated.ok, true);
  assert.equal(validated.state.activeSlot, 2);
  assert.equal(validated.state.slots[1].summary.stars, 3);

  const tampered = structuredClone(archive);
  tampered.slots[1].snapshot['threecountry:srpg:v2'] = JSON.stringify({ screen: 'result' });
  assert.equal(validateArchive(tampered).ok, false);
});

test('corrupted slot checksum is normalized to an empty safe slot', () => {
  const state = emptySlotsState(1000);
  const slot = createSlot({ id: 1, snapshot, now: 2000 });
  slot.checksum = '00000000';
  const normalized = normalizeSlotsState({ activeSlot: 1, slots: [slot] }, 3000);
  assert.deepEqual(normalized.slots[0].snapshot, {});
  assert.equal(normalized.slots[0].summary, null);
});

test('runtime captures all progress keys while preserving global preferences', () => {
  assert.ok(runtime.includes("key.startsWith(PROGRESS_PREFIX)"));
  assert.ok(runtime.includes('GLOBAL_SETTING_KEYS.has(key)'));
  assert.ok(runtime.includes('state.lastBackup = createArchive(state)'));
  assert.ok(runtime.includes('window.setInterval(autosave, 4000)'));
  assert.ok(runtime.includes('restoreSnapshot'));
  assert.ok(runtime.includes('importArchive'));
  assert.ok(runtime.includes('downloadArchive'));
});

test('release HTML and responsive CSS load save slot assets', () => {
  assert.ok(html.includes('save-slots-v1.css?v=1.2.0'));
  assert.ok(html.includes('save-slots-v1.js?v=1.2.0'));
  assert.ok(css.includes('.ssv1-slots'));
  assert.ok(css.includes('.ssv1-slot.active'));
  assert.ok(css.includes('env(safe-area-inset-bottom)') || css.includes('@media(max-width:820px)'));
});
