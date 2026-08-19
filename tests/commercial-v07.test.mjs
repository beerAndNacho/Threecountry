import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT, applyExperience, defaultCommercialMeta, heroGrowthStats,
  loadCommercialMeta, normalizeCommercialMeta, saveCommercialMeta,
} from '../commercial-data.js';
import { createBattle, forecastAction, getUnit, restoreBattle } from '../engine.js';

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

test('equipment and levels raise the real battle snapshot stats', () => {
  const base = createBattle({ seed: 41, commercial: null });
  const meta = defaultCommercialMeta();
  meta.progression.cao = { level: 5, xp: 0 };
  meta.loadouts.cao = { weapon: 'imperial-sabre', armor: 'black-iron-armor', accessory: 'phoenix-talisman' };
  meta.inventory.push('imperial-sabre', 'black-iron-armor', 'phoenix-talisman');
  const grown = createBattle({ seed: 41, commercial: normalizeCommercialMeta(meta) });
  const baseCao = unitByHero(base, 'cao');
  const grownCao = unitByHero(grown, 'cao');
  assert.equal(grownCao.level, 5);
  assert.ok(grownCao.maxHp > baseCao.maxHp);
  assert.ok(grownCao.attack > baseCao.attack);
  assert.ok(grownCao.magic > baseCao.magic);
  assert.equal(grownCao.equipment.weapon, 'imperial-sabre');
});

test('growth summary matches equipped officer battle stats before facility bonus', () => {
  const meta = defaultCommercialMeta();
  meta.progression.xun = { level: 3, xp: 11 };
  const growth = heroGrowthStats('xun', meta);
  const state = createBattle({ party: ['cao', 'xiahou', 'dian', 'xun'], commercial: meta });
  const xun = unitByHero(state, 'xun');
  assert.equal(xun.attack, growth.attack);
  assert.equal(xun.defense, growth.defense);
  assert.equal(xun.magic, growth.magic);
});

test('basic attack forecast exposes damage, critical and counter ranges', () => {
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

test('healing forecast reports actual recovery amount', () => {
  const state = createBattle({ party: ['cao', 'xiahou', 'dian', 'xun'] });
  const xun = put(state, 'xun', 3, 2);
  const cao = put(state, 'cao', 4, 2);
  cao.hp -= 30;
  const forecast = forecastAction(state, xun.id, cao.id, { skill: true });
  assert.equal(forecast.ok, true);
  assert.equal(forecast.kind, 'heal');
  assert.ok(forecast.amount > 24);
});

test('old version-two battle saves gain safe progression defaults', () => {
  const state = createBattle({ commercial: null });
  state.units.forEach((unit) => { delete unit.level; delete unit.equipment; });
  const restored = restoreBattle(state);
  restored.units.forEach((unit) => {
    assert.equal(unit.level, 1);
    assert.deepEqual(unit.equipment, {});
  });
});

test('commercial equipment catalog includes three slots and hero rewards', () => {
  const slots = new Set(Object.values(EQUIPMENT).map((item) => item.slot));
  assert.deepEqual([...slots].sort(), ['accessory', 'armor', 'weapon']);
  assert.ok(EQUIPMENT['imperial-sabre']);
  assert.ok(EQUIPMENT['black-iron-armor']);
  assert.ok(EQUIPMENT['phoenix-talisman']);
});
