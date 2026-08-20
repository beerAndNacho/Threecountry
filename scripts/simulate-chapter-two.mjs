import assert from 'node:assert/strict';
import {
  allUnitsActed, basicAttack, createBattle, executeEnemyAction, finishEnemyPhase,
  getBasicAttackTargets, getLivingUnits, getReachableCells, getSkillTargets,
  getUnit, moveUnit, nextEnemyUnit, planEnemyAction, startEnemyPhase, useSkill, waitUnit,
} from '../engine.js';
import { HEROES, TERRAIN } from '../content.js';
import { CHAPTER_TWO_MAPS, CHAPTER_TWO_OPERATIONS } from '../chapter-two-content-v1.js';

const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
const RUNS = Math.max(40, Number(runsArg?.split('=')[1] || 1000));
const PARTIES = [
  ['cao', 'xiahou', 'dian', 'guo'], ['cao', 'xiahou', 'xun', 'xu'],
  ['cao', 'dian', 'xun', 'guo'], ['cao', 'xiahou', 'guo', 'xu'],
];
const STRATEGIES = ['assault', 'steady', 'ambush'];
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function status() {
  return { shield: 0, stun: 0, root: 0, taunt: 0, attackDown: 0, attackUp: { amount: 0, turns: 0 }, defenseUp: { amount: 0, turns: 0 }, speedUp: { amount: 0, turns: 0 }, counterUp: { amount: 0, range: 0, turns: 0 } };
}
function unitFrom(heroId, index, spawn, multiplier) {
  const hero = HEROES[heroId];
  return {
    id: `enemy-sim-c2-${heroId}-${index}`, heroId, team: 'enemy', x: spawn.x, y: spawn.y,
    maxHp: Math.round(hero.maxHp * multiplier), hp: Math.round(hero.maxHp * multiplier), attack: Math.round(hero.attack * multiplier),
    defense: Math.round(hero.defense * multiplier), magic: Math.round(hero.magic * multiplier), speed: Math.max(1, Math.round(hero.speed * (1 + (multiplier - 1) * 0.45))),
    skill: hero.skillMax ? 1 : 0, skillMax: hero.skillMax || 0, acted: false, moved: false, dead: false, leader: Boolean(spawn.leader), firstAttack: true, status: status(),
  };
}
function buildBattle(seed, operation) {
  const map = CHAPTER_TWO_MAPS[operation.id];
  const battle = createBattle({ party: PARTIES[seed % PARTIES.length], strategy: STRATEGIES[seed % STRATEGIES.length], facilities: { barracks: 3, market: 2, granary: 3, academy: 3 }, difficulty: 'normal', seed: 250001 + seed * 6151 });
  const players = battle.units.filter((unit) => unit.team === 'player');
  players.forEach((unit, index) => { unit.x = map.playerSpawns[index].x; unit.y = map.playerSpawns[index].y; });
  battle.units = [...players, ...map.enemySpawns.map((spawn, index) => {
    let scale = operation.enemyScale;
    if (operation.elite?.includes(spawn.heroId)) scale *= operation.eliteScale || 1;
    return unitFrom(spawn.heroId, index, spawn, scale);
  })];
  battle.terrain = structuredClone(map.terrain); battle.width = 12; battle.height = 8;
  battle.objective = operation.leaderRequired ? { x: -1, y: -1, leaderHeroId: operation.leaderHeroId } : { ...map.objective };
  battle.turnLimit = operation.turnLimit;
  battle.operation = { id: operation.id, name: operation.name };
  battle.flags = { ...(battle.flags || {}), chapterTwoId: operation.id, simulation: true, bossEvents: {} };
  return battle;
}
function assertState(state) {
  assert.ok(state.turn >= 1 && state.turn <= state.turnLimit + 1, `invalid turn ${state.turn}`);
  const occupied = new Set();
  for (const unit of state.units) {
    assert.ok(HEROES[unit.heroId], `unknown hero ${unit.heroId}`);
    assert.ok(Number.isFinite(unit.hp) && Number.isFinite(unit.maxHp));
    assert.ok(unit.hp >= 0 && unit.hp <= unit.maxHp, `${unit.heroId} invalid hp ${unit.hp}/${unit.maxHp}`);
    assert.ok(unit.x >= 0 && unit.x < state.width && unit.y >= 0 && unit.y < state.height, `${unit.heroId} out of bounds`);
    if (!unit.dead && unit.hp > 0) { const key = `${unit.x},${unit.y}`; assert.equal(occupied.has(key), false, `duplicate ${key}`); occupied.add(key); }
  }
}
function skillChoice(state, unit) {
  const hero = HEROES[unit.heroId]; if (!hero?.skill || unit.skill <= 0) return null;
  const targets = getSkillTargets(state, unit.id); if (!targets.length) return null;
  if (hero.skill.type === 'heal') { const target = targets.filter((candidate) => candidate.hp / candidate.maxHp < .78).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; return target ? { targetId: target.id, priority: 95 } : null; }
  if (hero.skill.type === 'support') { const allies = getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= (hero.skill.range || 2)); return state.turn === 1 || allies.filter((ally) => ally.hp < ally.maxHp).length >= 2 ? { targetId: unit.id, priority: 84 } : null; }
  if (hero.skill.type === 'self') { const nearby = getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player').some((enemy) => distance(unit, enemy) <= 3); return unit.hp / unit.maxHp < .8 || nearby ? { targetId: unit.id, priority: 78 } : null; }
  if (hero.skill.type === 'area') { const nearby = getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player').filter((enemy) => distance(unit, enemy) <= (hero.skill.range || 2)); return nearby.length >= 2 ? { targetId: unit.id, priority: 100 } : null; }
  const target = targets.filter((candidate) => candidate.team !== unit.team).sort((a, b) => a.hp - b.hp)[0];
  return target ? { targetId: target.id, priority: target.hp <= 48 ? 106 : 88 } : null;
}
function afterMove(state, unitId) {
  const unit = getUnit(state, unitId); if (!unit || unit.dead || unit.acted) return state;
  const skill = skillChoice(state, unit);
  if (skill && skill.priority >= 82) { const result = useSkill(state, unit.id, skill.targetId); if (result.ok) return result.state; }
  const target = getBasicAttackTargets(state, unit.id).sort((a, b) => a.hp - b.hp)[0];
  if (target) { const result = basicAttack(state, unit.id, target.id); if (result.ok) return result.state; }
  if (skill) { const result = useSkill(state, unit.id, skill.targetId); if (result.ok) return result.state; }
  const waited = waitUnit(state, unit.id); return waited.ok ? waited.state : state;
}
function playerAction(input, unitId) {
  let state = input; let unit = getUnit(state, unitId); if (!unit || unit.dead || unit.acted) return state;
  const directSkill = skillChoice(state, unit); if (directSkill && directSkill.priority >= 95) { const result = useSkill(state, unit.id, directSkill.targetId); if (result.ok) return result.state; }
  const direct = getBasicAttackTargets(state, unit.id).sort((a, b) => a.hp - b.hp)[0]; if (direct) { const result = basicAttack(state, unit.id, direct.id); if (result.ok) return result.state; }
  const enemies = getLivingUnits(state, 'enemy'); if (!enemies.length) return state;
  const leader = enemies.find((enemy) => enemy.leader) || enemies[0];
  const target = enemies.slice().sort((a, b) => distance(unit, a) - distance(unit, b) + (a === leader ? -1.8 : 0) - (b === leader ? -1.8 : 0))[0];
  const cells = getReachableCells(state, unit.id).slice().sort((a, b) => {
    const at = TERRAIN[state.terrain[a.y][a.x]] || TERRAIN.grass; const bt = TERRAIN[state.terrain[b.y][b.x]] || TERRAIN.grass;
    const as = distance(a, target) * 12 + a.cost - (at.defense || 0) * 1.8 - (at.heal || 0) * (unit.hp / unit.maxHp < .55 ? .8 : 0);
    const bs = distance(b, target) * 12 + b.cost - (bt.defense || 0) * 1.8 - (bt.heal || 0) * (unit.hp / unit.maxHp < .55 ? .8 : 0);
    return as - bs;
  });
  const cell = cells[0]; if (cell && (cell.x !== unit.x || cell.y !== unit.y)) { const moved = moveUnit(state, unit.id, cell.x, cell.y); if (moved.ok) state = moved.state; }
  unit = getUnit(state, unitId); return unit && !unit.acted && !unit.dead ? afterMove(state, unit.id) : state;
}
function applyBossEvents(state, operation) {
  const event = state.flags.bossEvents;
  const enemy = (id) => state.units.find((unit) => unit.team === 'enemy' && unit.heroId === id && !unit.dead && unit.hp > 0);
  if (operation.id === 'hulao-scout' && !event.shield) { const boss = enemy('huaxiong'); if (boss) boss.status.shield += 18; event.shield = true; }
  if (operation.id === 'poisoned-dispatch' && state.turn >= 3 && !event.poison) { state.units.filter((unit) => unit.team === 'player' && !unit.dead).forEach((unit) => { unit.status.attackDown += 4; }); event.poison = true; }
  if (operation.id === 'flying-general' && !event.unmatched) { const boss = enemy('lubu'); if (boss && boss.hp <= boss.maxHp * .5) { boss.attack += 7; boss.speed += 2; boss.status.shield += 16; boss.hp = Math.min(boss.maxHp, boss.hp + 18); event.unmatched = true; } }
  if (operation.id === 'burning-luoyang') {
    const boss = enemy('dongzhuo'); if (boss && event.shieldTurn !== state.turn && state.phase === 'player') { boss.status.shield += 8; event.shieldTurn = state.turn; }
    const map = CHAPTER_TWO_MAPS[operation.id]; if (state.turn >= map.reinforcements.turn && !event.reinforced) {
      const occupied = new Set(state.units.filter((unit) => !unit.dead && unit.hp > 0).map((unit) => `${unit.x},${unit.y}`));
      for (const [index, spawn] of map.reinforcements.units.entries()) if (!occupied.has(`${spawn.x},${spawn.y}`)) state.units.push(unitFrom(spawn.heroId, 20 + index, spawn, operation.enemyScale));
      event.reinforced = true;
    }
  }
}
function simulate(seed, operation) {
  let state = buildBattle(seed, operation); let guard = 0;
  while (!state.result && guard < 260) {
    guard += 1; applyBossEvents(state, operation); assertState(state);
    if (state.phase === 'player') {
      const order = getLivingUnits(state, 'player').filter((unit) => !unit.acted).sort((a, b) => b.speed - a.speed);
      for (const unit of order) { state = playerAction(state, unit.id); assertState(state); if (state.result) break; }
      if (!state.result && !allUnitsActed(state, 'player')) for (const unit of getLivingUnits(state, 'player').filter((candidate) => !candidate.acted)) { const waited = waitUnit(state, unit.id); if (waited.ok) state = waited.state; }
      if (!state.result) state = startEnemyPhase(state);
    } else if (state.phase === 'enemy') {
      let enemy = nextEnemyUnit(state);
      while (enemy && !state.result) { const result = executeEnemyAction(state, planEnemyAction(state, enemy.id)); assert.equal(result.ok, true); state = result.state; assertState(state); enemy = nextEnemyUnit(state); }
      if (!state.result) state = finishEnemyPhase(state);
    } else break;
  }
  assert.ok(state.result, `${operation.id} simulation ${seed} did not finish`); assert.ok(guard < 260); assertState(state);
  return { id: operation.id, outcome: state.result.outcome, reason: state.result.reason, turn: state.turn, playerAlive: getLivingUnits(state, 'player').length, enemyAlive: getLivingUnits(state, 'enemy').length };
}

const results = [];
for (let index = 0; index < RUNS; index += 1) results.push(simulate(index, CHAPTER_TWO_OPERATIONS[index % CHAPTER_TWO_OPERATIONS.length]));
const report = CHAPTER_TWO_OPERATIONS.map((operation) => {
  const rows = results.filter((result) => result.id === operation.id); const victories = rows.filter((result) => result.outcome === 'victory').length;
  return { operation: operation.id, runs: rows.length, victories, defeats: rows.length - victories, winRate: Number((victories / rows.length).toFixed(4)), averageTurns: Number((rows.reduce((sum, result) => sum + result.turn, 0) / rows.length).toFixed(2)), maxTurn: Math.max(...rows.map((result) => result.turn)), minTurn: Math.min(...rows.map((result) => result.turn)) };
});
assert.equal(results.length, RUNS);
for (const item of report) { assert.ok(item.winRate >= 0 && item.winRate <= 1); assert.ok(item.maxTurn <= CHAPTER_TWO_OPERATIONS.find((operation) => operation.id === item.operation).turnLimit + 1); }
console.log(JSON.stringify({ chapter: 2, runs: RUNS, operations: report }, null, 2));
