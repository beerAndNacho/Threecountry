import assert from 'node:assert/strict';
import {
  allUnitsActed, basicAttack, createBattle, executeEnemyAction, finishEnemyPhase,
  getBasicAttackTargets, getLivingUnits, getReachableCells, getSkillTargets,
  getUnit, moveUnit, nextEnemyUnit, planEnemyAction, startEnemyPhase, useSkill, waitUnit,
} from '../engine.js';
import { HEROES, TERRAIN } from '../content.js';

const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
const RUNS = Math.max(10, Number(runsArg?.split('=')[1] || 1000));
const PARTIES = [
  ['cao', 'xiahou', 'dian', 'guo'],
  ['cao', 'xiahou', 'xun', 'xu'],
  ['cao', 'dian', 'xun', 'guo'],
  ['cao', 'xiahou', 'guo', 'xu'],
];
const STRATEGIES = ['assault', 'steady', 'ambush'];

const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function assertState(state) {
  assert.ok(state.turn >= 1 && state.turn <= state.turnLimit + 1, `invalid turn ${state.turn}`);
  const occupied = new Set();
  for (const unit of state.units) {
    assert.ok(Number.isFinite(unit.hp) && Number.isFinite(unit.maxHp), 'non-finite HP');
    assert.ok(unit.hp >= 0 && unit.hp <= unit.maxHp, `invalid HP ${unit.heroId}: ${unit.hp}/${unit.maxHp}`);
    assert.ok(unit.x >= 0 && unit.x < state.width && unit.y >= 0 && unit.y < state.height, `out of bounds ${unit.heroId}`);
    if (!unit.dead && unit.hp > 0) {
      const key = `${unit.x},${unit.y}`;
      assert.equal(occupied.has(key), false, `duplicate living position ${key}`);
      occupied.add(key);
    }
  }
}

function skillChoice(state, unit) {
  const hero = HEROES[unit.heroId];
  if (!hero?.skill || unit.skill <= 0) return null;
  const targets = getSkillTargets(state, unit.id);
  if (!targets.length) return null;
  if (hero.skill.type === 'heal') {
    const injured = targets.filter((target) => target.hp / target.maxHp < 0.78).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    return injured ? { targetId: injured.id, priority: 95 } : null;
  }
  if (hero.skill.type === 'support') {
    const allies = getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= (hero.skill.range || 2));
    const injured = allies.filter((ally) => ally.hp < ally.maxHp).length;
    return (state.turn === 1 || injured >= 2) ? { targetId: unit.id, priority: 82 } : null;
  }
  if (hero.skill.type === 'self') {
    const nearby = getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player').some((enemy) => distance(unit, enemy) <= 3);
    return (unit.hp / unit.maxHp < 0.8 || nearby) ? { targetId: unit.id, priority: 75 } : null;
  }
  if (hero.skill.type === 'area') {
    const nearby = getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player').filter((enemy) => distance(unit, enemy) <= (hero.skill.range || 2));
    return nearby.length >= 2 ? { targetId: unit.id, priority: 100 } : null;
  }
  const enemy = targets.filter((target) => target.team !== unit.team).sort((a, b) => a.hp - b.hp)[0];
  return enemy ? { targetId: enemy.id, priority: enemy.hp <= 45 ? 105 : 88 } : null;
}

function actAfterMove(state, unitId) {
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead || unit.acted) return state;
  const skill = skillChoice(state, unit);
  if (skill && skill.priority >= 82) {
    const result = useSkill(state, unit.id, skill.targetId);
    if (result.ok) return result.state;
  }
  const target = getBasicAttackTargets(state, unit.id).sort((a, b) => a.hp - b.hp)[0];
  if (target) {
    const result = basicAttack(state, unit.id, target.id);
    if (result.ok) return result.state;
  }
  if (skill) {
    const result = useSkill(state, unit.id, skill.targetId);
    if (result.ok) return result.state;
  }
  const waited = waitUnit(state, unit.id);
  return waited.ok ? waited.state : state;
}

function playerAction(inputState, unitId) {
  let state = inputState;
  let unit = getUnit(state, unitId);
  if (!unit || unit.dead || unit.acted) return state;

  const directSkill = skillChoice(state, unit);
  if (directSkill && directSkill.priority >= 95) {
    const result = useSkill(state, unit.id, directSkill.targetId);
    if (result.ok) return result.state;
  }
  const directTarget = getBasicAttackTargets(state, unit.id).sort((a, b) => a.hp - b.hp)[0];
  if (directTarget) {
    const result = basicAttack(state, unit.id, directTarget.id);
    if (result.ok) return result.state;
  }

  const enemies = getLivingUnits(state, 'enemy');
  if (!enemies.length) return state;
  const leader = enemies.find((enemy) => enemy.leader) || enemies.find((enemy) => enemy.heroId === 'liu');
  const target = enemies.slice().sort((a, b) => {
    const aScore = distance(unit, a) + (a === leader ? -1.4 : 0) + a.hp / a.maxHp;
    const bScore = distance(unit, b) + (b === leader ? -1.4 : 0) + b.hp / b.maxHp;
    return aScore - bScore;
  })[0];
  const reachable = getReachableCells(state, unit.id).slice().sort((a, b) => {
    const aTerrain = TERRAIN[state.terrain[a.y][a.x]] || TERRAIN.grass;
    const bTerrain = TERRAIN[state.terrain[b.y][b.x]] || TERRAIN.grass;
    const aScore = distance(a, target) * 12 + a.cost - (aTerrain.defense || 0) * 1.7 - (aTerrain.heal || 0) * (unit.hp / unit.maxHp < 0.55 ? 0.8 : 0);
    const bScore = distance(b, target) * 12 + b.cost - (bTerrain.defense || 0) * 1.7 - (bTerrain.heal || 0) * (unit.hp / unit.maxHp < 0.55 ? 0.8 : 0);
    return aScore - bScore;
  });
  const destination = reachable[0];
  if (destination && (destination.x !== unit.x || destination.y !== unit.y)) {
    const moved = moveUnit(state, unit.id, destination.x, destination.y);
    if (moved.ok) state = moved.state;
  }
  unit = getUnit(state, unitId);
  return unit && !unit.dead && !unit.acted ? actAfterMove(state, unit.id) : state;
}

function scaleUnit(unit, multiplier) {
  unit.maxHp = Math.max(1, Math.round(unit.maxHp * multiplier));
  unit.hp = Math.max(1, Math.round(unit.hp * multiplier));
  unit.attack = Math.max(1, Math.round(unit.attack * multiplier));
  unit.defense = Math.max(0, Math.round(unit.defense * multiplier));
  unit.magic = Math.max(0, Math.round(unit.magic * multiplier));
  unit.speed = Math.max(1, Math.round(unit.speed * (1 + (multiplier - 1) * 0.45)));
}

function applyOnboardingOperation(state) {
  // Mirrors OPERATION 1-1: west-road on normal difficulty.
  state.turnLimit = 11;
  state.units.filter((unit) => unit.team === 'enemy').forEach((unit) => scaleUnit(unit, 0.9));
  state.units.filter((unit) => unit.team === 'player').forEach((unit) => {
    unit.status.shield = (unit.status.shield || 0) + 8;
  });
  state.log.unshift({ turn: 1, tone: 'story', text: '1-1 서쪽 난민로 · 군웅 난이도 시뮬레이션.' });
  return state;
}

function simulate(seed) {
  let state = createBattle({
    party: PARTIES[seed % PARTIES.length],
    strategy: STRATEGIES[seed % STRATEGIES.length],
    facilities: { barracks: 2, market: 2, granary: 2, academy: 2 },
    difficulty: 'normal',
    seed: 190001 + seed * 7919,
  });
  state = applyOnboardingOperation(state);
  let guard = 0;
  while (!state.result && guard < 240) {
    guard += 1;
    assertState(state);
    if (state.phase === 'player') {
      const order = getLivingUnits(state, 'player').filter((unit) => !unit.acted).sort((a, b) => b.speed - a.speed);
      for (const unit of order) {
        state = playerAction(state, unit.id);
        assertState(state);
        if (state.result) break;
      }
      if (!state.result && !allUnitsActed(state, 'player')) {
        for (const unit of getLivingUnits(state, 'player').filter((candidate) => !candidate.acted)) {
          const waited = waitUnit(state, unit.id);
          if (waited.ok) state = waited.state;
        }
      }
      if (!state.result) state = startEnemyPhase(state);
    } else if (state.phase === 'enemy') {
      let enemy = nextEnemyUnit(state);
      while (enemy && !state.result) {
        const plan = planEnemyAction(state, enemy.id);
        const result = executeEnemyAction(state, plan);
        assert.equal(result.ok, true, `invalid enemy action for ${enemy.heroId}`);
        state = result.state;
        assertState(state);
        enemy = nextEnemyUnit(state);
      }
      if (!state.result) state = finishEnemyPhase(state);
    } else {
      break;
    }
  }
  assert.ok(state.result, `simulation ${seed} did not finish`);
  assert.ok(guard < 240, `simulation ${seed} exceeded guard`);
  assertState(state);
  return {
    outcome: state.result.outcome,
    reason: state.result.reason,
    turn: state.turn,
    playerAlive: getLivingUnits(state, 'player').length,
    enemyAlive: getLivingUnits(state, 'enemy').length,
  };
}

const results = [];
for (let index = 0; index < RUNS; index += 1) results.push(simulate(index));
const victories = results.filter((result) => result.outcome === 'victory').length;
const defeats = RUNS - victories;
const winRate = victories / RUNS;
const averageTurns = results.reduce((sum, result) => sum + result.turn, 0) / RUNS;
const commandCaptures = results.filter((result) => result.reason === 'command-captured').length;
const leaderVictories = results.filter((result) => result.reason === 'leader-defeated' && result.outcome === 'victory').length;
const report = {
  operation: '1-1 west-road / normal',
  runs: RUNS,
  victories,
  defeats,
  winRate: Number(winRate.toFixed(4)),
  averageTurns: Number(averageTurns.toFixed(2)),
  commandCaptures,
  leaderVictories,
  maxTurn: Math.max(...results.map((result) => result.turn)),
  minTurn: Math.min(...results.map((result) => result.turn)),
};
assert.equal(victories + defeats, RUNS);
assert.ok(winRate >= 0.15 && winRate <= 0.65, `onboarding balance proxy outside 15–65%: ${winRate}`);
assert.ok(report.maxTurn <= 12, `invalid max turn ${report.maxTurn}`);
console.log(JSON.stringify(report, null, 2));
