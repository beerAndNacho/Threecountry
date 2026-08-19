import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../content.js';
import {
  EQUIPMENT, applyExperience, defaultCommercialMeta, heroGrowthStats,
  loadCommercialMeta, normalizeCommercialMeta, saveCommercialMeta,
} from '../commercial-data.js';
import { forecastAction, syncCommercialHeroStats } from '../forecast-action.js';
import { createBattle } from '../engine.js';

function unitByHero(state, heroId) {
  return state.units.find((unit) => unit.heroId === heroId && !unit.dead);
}

function put(state, heroId, x, y) {
  const unit = unitByHero(state, heroId);
  unit.x = x;
  unit.y = y;
  return unit;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('commercial meta persists and normalizes all six player officers', () => {
  const storage = memoryStorage();
  const saved = defaultCommercialMeta();
  saved.mastery = 7;
  saveCommercialMeta(saved, storage);
  const loaded = loadCommercialMeta(storage);
  assert.equal(loaded.mastery, 7);
  assert.equal(Object.keys(loaded.progression).length, 6);
  assert.ok(loaded.inventory.includes('bronze-sabre'));
});

test('experience levels an officer and retains overflow XP', () => {
  const meta = defaultCommercialMeta();
  const result = applyExperience(meta, 'cao', 200);
  assert.ok(result.growth.level >= 2);
  assert.ok(result.growth.xp >= 0);
  assert.ok(result.levels >= 1);
});

test('equipment and levels are synchronized into actual battle creation stats', () => {
  const meta = defaultCommercialMeta();
  meta.progression.cao = { level: 5, xp: 0 };
  meta.loadouts.cao = { weapon: 'imperial-sabre', armor: 'black-iron-armor', accessory: 'phoenix-talisman' };
  meta.inventory.push('imperial-sabre', 'black-iron-armor', 'phoenix-talisman');
  const normalized = normalizeCommercialMeta(meta);
  const expected = heroGrowthStats('cao', normalized);
  syncCommercialHeroStats(normalized);
  const state = createBattle({ seed: 41 });
  const cao = unitByHero(state, 'cao');
  assert.equal(cao.maxHp, expected.hp);
  assert.equal(cao.attack, expected.attack);
  assert.equal(cao.defense, expected.defense);
  assert.equal(cao.magic, expected.magic);
});

test('repeated stat synchronization never compounds growth', () => {
  const meta = defaultCommercialMeta();
  meta.progression.xun = { level: 4, xp: 0 };
  const expected = heroGrowthStats('xun', meta);
  syncCommercialHeroStats(meta);
  syncCommercialHeroStats(meta);
  assert.equal(HEROES.xun.maxHp, expected.hp);
  assert.equal(HEROES.xun.magic, expected.magic);
});

test('basic attack forecast exposes damage critical and counter ranges', () => {
  const state = createBattle({ seed: 77 });
  const cao = put(state, 'cao', 4, 2);
  const soldier = put(state, 'soldier-spear', 5, 2);
  const forecast = forecastAction(state, cao.id, soldier.id);
  assert.equal(forecast.ok, true);
  assert.equal(forecast.kind, 'attack');
  assert.ok(forecast.minDamage > 0);
  assert.ok(forecast.maxDamage >= forecast.minDamage);
  assert.ok(forecast.criticalChance >= 0);
  assert.ok(forecast.counter?.maxDamage >= forecast.counter?.minDamage);
  assert.equal(forecast.terrain.name, '다리');
});

test('ranged strategist forecast has no counter when target cannot reach', () => {
  const state = createBattle({ party: ['cao', 'xiahou', 'dian', 'guo'], seed: 91 });
  const guo = put(state, 'guo', 4, 2);
  const target = put(state, 'soldier-spear', 7, 2);
  const forecast = forecastAction(state, guo.id, target.id, { skill: true });
  assert.equal(forecast.ok, true);
  assert.equal(forecast.kind, 'skill-attack');
  assert.equal(forecast.counter, null);
  assert.equal(forecast.skillName, '허점 간파');
});

test('healing forecast reports recovery amount', () => {
  const state = createBattle({ party: ['cao', 'xiahou', 'dian', 'xun'] });
  const xun = put(state, 'xun', 3, 2);
  const cao = put(state, 'cao', 4, 2);
  cao.hp -= 30;
  const forecast = forecastAction(state, xun.id, cao.id, { skill: true });
  assert.equal(forecast.ok, true);
  assert.equal(forecast.kind, 'heal');
  assert.ok(forecast.amount > 24);
});

test('commercial equipment catalog includes all three slots and hero rewards', () => {
  const slots = new Set(Object.values(EQUIPMENT).map((item) => item.slot));
  assert.deepEqual([...slots].sort(), ['accessory', 'armor', 'weapon']);
  assert.ok(EQUIPMENT['imperial-sabre']);
  assert.ok(EQUIPMENT['black-iron-armor']);
  assert.ok(EQUIPMENT['phoenix-talisman']);
});
