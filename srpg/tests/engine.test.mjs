import test from 'node:test';
import assert from 'node:assert/strict';
import {
  basicAttack, createBattle, executeEnemyAction, getBasicAttackTargets,
  getLivingUnits, getReachableCells, getSkillTargets, getUnit, moveUnit,
  planEnemyAction, useSkill,
} from '../engine.js';

function unitByHero(state, heroId) {
  return state.units.find((unit) => unit.heroId === heroId && !unit.dead);
}

function put(state, heroId, x, y) {
  const unit = unitByHero(state, heroId);
  unit.x = x;
  unit.y = y;
  return unit;
}

test('creates four player officers and six enemy units', () => {
  const state = createBattle();
  assert.equal(getLivingUnits(state, 'player').length, 4);
  assert.equal(getLivingUnits(state, 'enemy').length, 6);
  assert.equal(unitByHero(state, 'cao').leader, false);
  assert.equal(unitByHero(state, 'liu').leader, true);
});

test('movement cannot enter river or occupied cells', () => {
  const state = createBattle();
  const cao = unitByHero(state, 'cao');
  cao.x = 4;
  cao.y = 1;
  const cells = getReachableCells(state, cao.id);
  assert.equal(cells.some((cell) => cell.x === 5 && cell.y === 1), false, 'river must be blocked');
  const occupied = unitByHero(state, 'xiahou');
  occupied.x = 4;
  occupied.y = 2;
  const next = getReachableCells(state, cao.id);
  assert.equal(next.some((cell) => cell.x === 4 && cell.y === 2), false, 'occupied tile must be blocked');
});

test('player can move and then attack within range', () => {
  let state = createBattle();
  const cao = put(state, 'cao', 3, 2);
  const soldier = put(state, 'soldier-spear', 5, 2);
  const moved = moveUnit(state, cao.id, 4, 2);
  assert.equal(moved.ok, true);
  state = moved.state;
  const targets = getBasicAttackTargets(state, cao.id);
  assert.ok(targets.some((target) => target.id === soldier.id));
  const attacked = basicAttack(state, cao.id, soldier.id, { noCounter: true });
  assert.equal(attacked.ok, true);
  assert.ok(getUnit(attacked.state, soldier.id).hp < soldier.maxHp);
  assert.equal(getUnit(attacked.state, cao.id).acted, true);
});

test('same seed and same attack produce the same damage', () => {
  const first = createBattle({ seed: 7733 });
  const second = createBattle({ seed: 7733 });
  const a1 = put(first, 'cao', 3, 2);
  const d1 = put(first, 'soldier-spear', 4, 2);
  const a2 = put(second, 'cao', 3, 2);
  const d2 = put(second, 'soldier-spear', 4, 2);
  const r1 = basicAttack(first, a1.id, d1.id, { force: true, noCounter: true });
  const r2 = basicAttack(second, a2.id, d2.id, { force: true, noCounter: true });
  assert.equal(r1.event.damage, r2.event.damage);
  assert.equal(r1.event.critical, r2.event.critical);
});

test('Guo Jia skill deals damage and roots the target', () => {
  const state = createBattle({ party: ['cao', 'xiahou', 'dian', 'guo'] });
  const guo = put(state, 'guo', 4, 2);
  const target = put(state, 'liu', 7, 2);
  assert.ok(getSkillTargets(state, guo.id).some((unit) => unit.id === target.id));
  const result = useSkill(state, guo.id, target.id);
  assert.equal(result.ok, true);
  assert.ok(getUnit(result.state, target.id).hp < target.maxHp);
  assert.equal(getUnit(result.state, target.id).status.root, 2);
});

test('Xiahou Dun skill grants shield and taunt', () => {
  const state = createBattle();
  const xiahou = unitByHero(state, 'xiahou');
  const result = useSkill(state, xiahou.id, xiahou.id);
  assert.equal(result.ok, true);
  assert.equal(getUnit(result.state, xiahou.id).status.shield, 24);
  assert.equal(getUnit(result.state, xiahou.id).status.taunt, 2);
});

test('enemy AI attacks immediately when a player is in range', () => {
  const state = createBattle();
  state.phase = 'enemy';
  const guan = put(state, 'guan', 4, 2);
  const cao = put(state, 'cao', 5, 2);
  const plan = planEnemyAction(state, guan.id);
  assert.ok(['attack', 'skill'].includes(plan.type));
  assert.equal(plan.targetId, cao.id);
  const result = executeEnemyAction(state, plan);
  assert.equal(result.ok, true);
  assert.ok(getUnit(result.state, cao.id).hp < cao.maxHp);
});

test('defeating Liu Bei ends battle with victory', () => {
  const state = createBattle();
  const dian = put(state, 'dian', 10, 3);
  const liu = put(state, 'liu', 11, 3);
  liu.hp = 1;
  const result = basicAttack(state, dian.id, liu.id, { force: true, noCounter: true });
  assert.equal(result.ok, true);
  assert.equal(result.state.result.outcome, 'victory');
  assert.equal(result.state.result.reason, 'leader-defeated');
});

test('occupying the command camp wins even if Liu Bei survives', () => {
  const state = createBattle();
  const cao = put(state, 'cao', 10, 3);
  put(state, 'liu', 10, 2);
  const moved = moveUnit(state, cao.id, 11, 3);
  assert.equal(moved.ok, true);
  assert.equal(moved.state.result.outcome, 'victory');
  assert.equal(moved.state.result.reason, 'command-captured');
});

test('strategy and facilities change opening stats', () => {
  const steady = createBattle({ strategy: 'steady', facilities: { barracks: 3, market: 1, granary: 2, academy: 1 } });
  const assault = createBattle({ strategy: 'assault', facilities: { barracks: 1, market: 1, granary: 1, academy: 1 } });
  const steadyCao = unitByHero(steady, 'cao');
  const assaultCao = unitByHero(assault, 'cao');
  assert.ok(steadyCao.maxHp > assaultCao.maxHp);
  assert.ok(steadyCao.defense > assaultCao.defense);
  assert.equal(steadyCao.status.shield, 10);
  assert.ok(steadyCao.skill >= assaultCao.skill);
});
