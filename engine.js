import {
  CHAPTER, CLASSES, DEFAULT_PARTY, DEPLOYMENT_SLOTS, ENEMY_SPAWNS,
  HEROES, MAP, STRATEGIES, TERRAIN,
} from './content.js';

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const keyOf = (x, y) => `${x},${y}`;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const inBounds = (x, y) => y >= 0 && y < MAP.length && x >= 0 && x < MAP[0].length;

export function createRng(seed = Date.now()) {
  let normalized = Number(seed) >>> 0;
  if (!normalized) normalized = 0x9e3779b9;
  return normalized;
}

function random(state) {
  let x = state.rng >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.rng = x >>> 0;
  return (state.rng & 0xffffffff) / 0x100000000 + 0.5;
}

function unitFromHero(heroId, team, index, position, facilities, difficulty) {
  const hero = HEROES[heroId];
  const hpBonus = team === 'player' ? 1 + (facilities.barracks - 1) * 0.04 : difficulty === 'hard' ? 1.08 : 1;
  const enemyBonus = team === 'enemy' && difficulty === 'hard' ? 1.06 : 1;
  const skillBonus = team === 'player' && facilities.granary >= 2 ? 1 : 0;
  const maxHp = Math.round(hero.maxHp * hpBonus * enemyBonus);
  return {
    id: `${team}-${heroId}-${index}`,
    heroId,
    team,
    x: position.x,
    y: position.y,
    maxHp,
    hp: maxHp,
    attack: Math.round(hero.attack * enemyBonus),
    defense: Math.round(hero.defense * enemyBonus),
    magic: Math.round(hero.magic * enemyBonus),
    speed: Math.round(hero.speed * enemyBonus),
    skill: Math.min(hero.skillMax ?? 0, 1 + skillBonus),
    skillMax: hero.skillMax ?? 0,
    acted: false,
    moved: false,
    dead: false,
    leader: Boolean(position.leader),
    firstAttack: true,
    status: {
      shield: 0,
      stun: 0,
      root: 0,
      taunt: 0,
      attackDown: 0,
      attackUp: { amount: 0, turns: 0 },
      defenseUp: { amount: 0, turns: 0 },
      speedUp: { amount: 0, turns: 0 },
      counterUp: { amount: 0, range: 0, turns: 0 },
    },
  };
}

export function createBattle(options = {}) {
  const party = options.party?.length === 4 ? options.party : DEFAULT_PARTY;
  const strategyId = STRATEGIES[options.strategy] ? options.strategy : 'assault';
  const facilities = {
    barracks: options.facilities?.barracks ?? 1,
    market: options.facilities?.market ?? 1,
    granary: options.facilities?.granary ?? 1,
    academy: options.facilities?.academy ?? 1,
  };
  const difficulty = options.difficulty ?? 'normal';
  const units = [];
  party.forEach((heroId, index) => units.push(unitFromHero(heroId, 'player', index, DEPLOYMENT_SLOTS[index], facilities, difficulty)));
  ENEMY_SPAWNS.forEach((spawn, index) => units.push(unitFromHero(spawn.heroId, 'enemy', index, spawn, facilities, difficulty)));

  const strategy = STRATEGIES[strategyId];
  if (strategy.bonuses.defense) {
    units.filter((unit) => unit.team === 'player').forEach((unit) => { unit.defense += strategy.bonuses.defense; });
  }
  if (strategy.bonuses.shield) {
    units.filter((unit) => unit.team === 'player').forEach((unit) => { unit.status.shield = strategy.bonuses.shield; });
  }
  if (strategy.bonuses.freeSkill) {
    units.filter((unit) => unit.team === 'player' && unit.skillMax > 0).forEach((unit) => { unit.skill = Math.min(unit.skillMax, unit.skill + 1); });
  }

  return {
    version: 2,
    width: MAP[0].length,
    height: MAP.length,
    terrain: clone(MAP),
    turn: 1,
    turnLimit: CHAPTER.turnLimit,
    phase: 'player',
    strategyId,
    facilities,
    difficulty,
    rng: createRng(options.seed ?? 190001),
    units,
    selectedId: null,
    movedFrom: null,
    objective: { x: 11, y: 3, leaderHeroId: 'liu' },
    result: null,
    log: [{ turn: 1, tone: 'story', text: '조조군의 첫 전투가 시작되었습니다.' }],
    flags: { bossDialogue: false, commandCaptured: false },
  };
}

export function getLivingUnits(state, team = null) {
  return state.units.filter((unit) => !unit.dead && unit.hp > 0 && (!team || unit.team === team));
}

export function getUnit(state, unitId) {
  return state.units.find((unit) => unit.id === unitId) ?? null;
}

export function getUnitAt(state, x, y) {
  return state.units.find((unit) => !unit.dead && unit.x === x && unit.y === y) ?? null;
}

export function terrainAt(state, x, y) {
  return TERRAIN[state.terrain[y]?.[x]] ?? TERRAIN.grass;
}

function classData(unit) {
  return CLASSES[HEROES[unit.heroId].classId];
}

function classAdvantage(attacker, defender) {
  const attackClass = classData(attacker);
  const defendClassId = HEROES[defender.heroId].classId;
  if (attackClass.strong === defendClassId) return 1.2;
  if (attackClass.weak === defendClassId) return 0.85;
  return 1;
}

function auraDefense(state, target) {
  let value = 0;
  for (const unit of getLivingUnits(state, target.team)) {
    if (unit.id === target.id || distance(unit, target) > 1) continue;
    if (unit.heroId === 'xu') value += 3;
    if (unit.heroId === 'liu') value += 2;
  }
  return value;
}

function effectiveAttack(unit) {
  let value = unit.attack + (unit.status.attackUp.turns > 0 ? unit.status.attackUp.amount : 0) - unit.status.attackDown;
  return Math.max(1, value);
}

function effectiveDefense(state, unit) {
  let value = unit.defense + (unit.status.defenseUp.turns > 0 ? unit.status.defenseUp.amount : 0) + auraDefense(state, unit);
  if (unit.heroId === 'xiahou' && unit.hp <= unit.maxHp / 2) value += 6;
  value += terrainAt(state, unit.x, unit.y).defense ?? 0;
  return Math.max(0, value);
}

function movementAllowance(state, unit) {
  let move = classData(unit).move;
  if (state.strategyId === 'assault' && state.turn === 1 && unit.team === 'player') move += STRATEGIES.assault.bonuses.firstMove;
  if (unit.heroId === 'zhao' && getLivingUnits(state, unit.team).some((ally) => ally.hp / ally.maxHp < 0.5)) move += 2;
  if (unit.status.root > 0 || unit.status.stun > 0) return 0;
  return move;
}

function terrainMoveCost(state, unit, x, y) {
  const terrain = terrainAt(state, x, y);
  if (terrain.blocked) return Infinity;
  let cost = terrain.move;
  const classId = HEROES[unit.heroId].classId;
  if (classId === 'cavalry' && terrain.id === 'forest') cost += 1;
  if (classId === 'cavalry' && terrain.id === 'hill') cost += 1;
  if (state.strategyId === 'ambush' && unit.team === 'player' && terrain.id === 'forest') cost = 1;
  return cost;
}

export function getReachableCells(state, unitId) {
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead || unit.acted || unit.status.stun > 0) return [];
  const maxMove = movementAllowance(state, unit);
  const costs = new Map([[keyOf(unit.x, unit.y), 0]]);
  const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
  const directions = [[1,0],[-1,0],[0,1],[0,-1]];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) break;
    for (const [dx, dy] of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (!inBounds(x, y)) continue;
      const occupied = getUnitAt(state, x, y);
      if (occupied && occupied.id !== unit.id) continue;
      const nextCost = current.cost + terrainMoveCost(state, unit, x, y);
      if (nextCost > maxMove) continue;
      const key = keyOf(x, y);
      if (nextCost >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, nextCost);
      queue.push({ x, y, cost: nextCost });
    }
  }
  return [...costs.entries()].map(([key, cost]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, cost };
  });
}

function rangeFor(unit, skill = false) {
  const hero = HEROES[unit.heroId];
  if (skill && hero.skill) return [hero.skill.range ?? 0, hero.skill.range ?? 0];
  return classData(unit).range;
}

export function cellsInRange(state, unitId, options = {}) {
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead) return [];
  const [minRange, maxRange] = rangeFor(unit, Boolean(options.skill));
  const cells = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const d = Math.abs(unit.x - x) + Math.abs(unit.y - y);
      if (d >= minRange && d <= maxRange) cells.push({ x, y });
    }
  }
  return cells;
}

export function getBasicAttackTargets(state, unitId) {
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead || unit.acted || unit.status.stun > 0) return [];
  const [minRange, maxRange] = classData(unit).range;
  return getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player')
    .filter((target) => {
      const d = distance(unit, target);
      return d >= minRange && d <= maxRange;
    });
}

export function getSkillTargets(state, unitId) {
  const unit = getUnit(state, unitId);
  const hero = unit ? HEROES[unit.heroId] : null;
  if (!unit || !hero?.skill || unit.dead || unit.acted || unit.skill <= 0 || unit.status.stun > 0) return [];
  const skill = hero.skill;
  if (skill.type === 'self' || skill.type === 'area' || skill.type === 'support') return [unit];
  const pool = skill.type === 'heal' ? getLivingUnits(state, unit.team) : getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player');
  return pool.filter((target) => distance(unit, target) <= skill.range);
}

function pushLog(state, tone, text) {
  state.log.unshift({ turn: state.turn, tone, text });
  state.log = state.log.slice(0, 80);
}

export function moveUnit(inputState, unitId, x, y, options = {}) {
  const state = clone(inputState);
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead) return { ok: false, state: inputState, message: '장수를 찾을 수 없습니다.' };
  if (!options.force && unit.team !== (state.phase === 'player' ? 'player' : 'enemy')) return { ok: false, state: inputState, message: '현재 행동할 수 없는 부대입니다.' };
  const reachable = getReachableCells(state, unitId).some((cell) => cell.x === x && cell.y === y);
  if (!reachable) return { ok: false, state: inputState, message: '이동할 수 없는 칸입니다.' };
  state.movedFrom = options.keepUndo === false ? null : { unitId, x: unit.x, y: unit.y };
  const from = { x: unit.x, y: unit.y };
  unit.x = x;
  unit.y = y;
  unit.moved = true;
  pushLog(state, 'move', `${HEROES[unit.heroId].name}이(가) ${terrainAt(state, x, y).name}(으)로 이동했습니다.`);
  checkOutcome(state);
  return { ok: true, state, event: { type: 'move', unitId, from, to: { x, y } } };
}

export function undoMove(inputState, unitId) {
  const state = clone(inputState);
  const unit = getUnit(state, unitId);
  const movedFrom = state.movedFrom;
  if (!unit || !movedFrom || movedFrom.unitId !== unitId || unit.acted) return { ok: false, state: inputState, message: '되돌릴 이동이 없습니다.' };
  unit.x = movedFrom.x;
  unit.y = movedFrom.y;
  unit.moved = false;
  state.movedFrom = null;
  return { ok: true, state, event: { type: 'move-undo', unitId } };
}

function calculateDamage(state, attacker, defender, multiplier = 1, magic = false) {
  const offenseBase = magic ? attacker.magic : effectiveAttack(attacker);
  let defenseBase = effectiveDefense(state, defender);
  if (attacker.heroId === 'guan' && attacker.firstAttack) defenseBase *= 0.8;
  const academyBonus = attacker.team === 'player' && magic ? 1 + (state.facilities.academy - 1) * 0.05 : 1;
  const advantage = magic ? 1 : classAdvantage(attacker, defender);
  const strategyBonus = state.strategyId === 'assault' && attacker.team === 'player' && attacker.firstAttack ? 1 + STRATEGIES.assault.bonuses.firstDamage : 1;
  const variance = 0.92 + random(state) * 0.16;
  let criticalChance = 0.08 + Math.max(0, attacker.speed - defender.speed) * 0.008;
  if (attacker.heroId === 'guo' && attacker.firstAttack) criticalChance += 0.35;
  const critical = random(state) < criticalChance;
  const raw = (offenseBase * 1.3 - defenseBase * 0.72 + 8) * multiplier * academyBonus * advantage * strategyBonus * variance;
  return { damage: Math.max(4, Math.round(raw * (critical ? 1.45 : 1))), critical, advantage };
}

function findGuard(state, target) {
  if (target.heroId !== 'cao') return null;
  return getLivingUnits(state, target.team).find((unit) => unit.heroId === 'dian' && distance(unit, target) === 1 && unit.hp > 1) ?? null;
}

function receiveDamage(state, target, amount, sourceId, meta = {}) {
  let remaining = amount;
  let absorbed = 0;
  if (target.status.shield > 0) {
    absorbed = Math.min(target.status.shield, remaining);
    target.status.shield -= absorbed;
    remaining -= absorbed;
  }
  const guard = !meta.ignoreGuard ? findGuard(state, target) : null;
  let guarded = 0;
  if (guard && remaining > 0) {
    guarded = Math.min(Math.max(1, Math.round(remaining * 0.35)), guard.hp - 1);
    guard.hp -= guarded;
    remaining -= guarded;
    pushLog(state, 'guard', `전위가 조조 대신 ${guarded} 피해를 받아냈습니다.`);
  }
  target.hp = Math.max(0, target.hp - remaining);
  if (target.hp <= 0) {
    target.dead = true;
    target.acted = true;
    pushLog(state, target.team === 'enemy' ? 'good' : 'bad', `${HEROES[target.heroId].name}이(가) 전장에서 이탈했습니다.`);
  }
  return { hpDamage: remaining, absorbed, guarded, sourceId };
}

function canCounter(state, defender, attacker) {
  if (defender.dead || defender.status.stun > 0) return false;
  const baseRange = classData(defender).range;
  const maxRange = baseRange[1] + (defender.status.counterUp.turns > 0 ? defender.status.counterUp.range : 0);
  return distance(defender, attacker) >= baseRange[0] && distance(defender, attacker) <= maxRange;
}

function markActed(state, unit) {
  unit.acted = true;
  unit.moved = true;
  state.movedFrom = null;
  state.selectedId = null;
}

export function basicAttack(inputState, attackerId, targetId, options = {}) {
  const state = clone(inputState);
  const attacker = getUnit(state, attackerId);
  const defender = getUnit(state, targetId);
  if (!attacker || !defender || attacker.dead || defender.dead) return { ok: false, state: inputState, message: '공격 대상을 확인할 수 없습니다.' };
  if (!options.force && !getBasicAttackTargets(state, attackerId).some((target) => target.id === targetId)) return { ok: false, state: inputState, message: '공격 범위 밖입니다.' };
  const roll = calculateDamage(state, attacker, defender, 1, false);
  const received = receiveDamage(state, defender, roll.damage, attackerId);
  attacker.firstAttack = false;
  if (attacker.heroId === 'zhang' && !defender.dead) defender.status.attackDown = Math.max(defender.status.attackDown, 5);
  pushLog(state, roll.critical ? 'critical' : 'attack', `${HEROES[attacker.heroId].name}의 공격! ${HEROES[defender.heroId].name}에게 ${received.hpDamage} 피해${roll.critical ? ' · 치명타' : ''}.`);

  let counter = null;
  if (!options.noCounter && !defender.dead && canCounter(state, defender, attacker)) {
    const counterMultiplier = 0.68 + (defender.status.counterUp.turns > 0 ? defender.status.counterUp.amount : 0);
    const counterRoll = calculateDamage(state, defender, attacker, counterMultiplier, false);
    counter = receiveDamage(state, attacker, counterRoll.damage, defender.id, { ignoreGuard: true });
    pushLog(state, 'counter', `${HEROES[defender.heroId].name}의 반격! ${counter.hpDamage} 피해.`);
  }
  if (!options.keepAction) markActed(state, attacker);
  checkOutcome(state);
  if (attacker.heroId === 'cao' && defender.dead && !attacker.dead && !options.force) {
    attacker.acted = false;
    attacker.moved = true;
    pushLog(state, 'good', '조조의 기회 포착이 발동해 한 번 더 행동할 수 있습니다.');
  }
  return {
    ok: true,
    state,
    event: {
      type: 'attack', attackerId, targetId, damage: received.hpDamage,
      absorbed: received.absorbed, guarded: received.guarded, critical: roll.critical,
      counterDamage: counter?.hpDamage ?? 0,
    },
  };
}

function spendSkill(state, unit) {
  if (unit.skill <= 0) return false;
  unit.skill -= 1;
  return true;
}

function addTimedStatus(unit, name, amount, turns, extra = {}) {
  unit.status[name] = { ...unit.status[name], amount, turns, ...extra };
}

export function useSkill(inputState, unitId, targetId = unitId, options = {}) {
  const state = clone(inputState);
  const unit = getUnit(state, unitId);
  const target = getUnit(state, targetId);
  const hero = unit ? HEROES[unit.heroId] : null;
  if (!unit || !hero?.skill || unit.dead || unit.acted) return { ok: false, state: inputState, message: '기술을 사용할 수 없습니다.' };
  if (!options.force && !getSkillTargets(state, unitId).some((candidate) => candidate.id === targetId)) return { ok: false, state: inputState, message: '기술 대상이 범위 밖입니다.' };
  if (!spendSkill(state, unit)) return { ok: false, state: inputState, message: '기술력이 부족합니다.' };
  const skill = hero.skill;
  const events = [];

  if (skill.id === 'command-shift') {
    const affected = getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= 2);
    affected.forEach((ally) => {
      ally.hp = Math.min(ally.maxHp, ally.hp + 8);
      addTimedStatus(ally, 'attackUp', 5, 2);
      addTimedStatus(ally, 'speedUp', 3, 2);
    });
    pushLog(state, 'skill', `조조의 지휘 전환! ${affected.length}명의 공격과 속도가 상승했습니다.`);
    events.push({ type: 'buff-area', unitId, targets: affected.map((ally) => ally.id) });
  } else if (skill.id === 'iron-wall') {
    unit.status.shield += 24;
    unit.status.taunt = 2;
    addTimedStatus(unit, 'defenseUp', 7, 2);
    pushLog(state, 'skill', '하후돈이 불퇴의 방진을 펼쳤습니다.');
    events.push({ type: 'shield', unitId, amount: 24 });
  } else if (skill.id === 'guard-charge' && target) {
    const roll = calculateDamage(state, unit, target, skill.power, false);
    const received = receiveDamage(state, target, roll.damage, unit.id);
    if (!target.dead) target.status.stun = 1;
    pushLog(state, 'skill', `전위의 호위 돌격! ${received.hpDamage} 피해와 기절.`);
    events.push({ type: 'skill-hit', unitId, targetId, damage: received.hpDamage, status: 'stun' });
  } else if (skill.id === 'royal-plan' && target) {
    const academyBonus = 1 + (state.facilities.academy - 1) * 0.05;
    const heal = Math.round((skill.power + unit.magic * 0.45) * academyBonus);
    target.hp = Math.min(target.maxHp, target.hp + heal);
    target.skill = Math.min(target.skillMax, target.skill + 1);
    pushLog(state, 'heal', `순욱의 왕좌의 설계! ${HEROES[target.heroId].name}이(가) ${heal} 회복했습니다.`);
    events.push({ type: 'heal', unitId, targetId, amount: heal });
  } else if (skill.id === 'read-flaw' && target) {
    const roll = calculateDamage(state, unit, target, skill.power, true);
    const received = receiveDamage(state, target, roll.damage, unit.id);
    if (!target.dead) target.status.root = 2;
    pushLog(state, 'skill', `곽가가 허점을 간파했습니다. ${received.hpDamage} 피해, 이동 봉쇄.`);
    events.push({ type: 'skill-hit', unitId, targetId, damage: received.hpDamage, status: 'root' });
  } else if (skill.id === 'tiger-guard') {
    addTimedStatus(unit, 'counterUp', 0.5, 2, { range: 1 });
    unit.status.shield += 16;
    pushLog(state, 'skill', '허저가 중군을 지키며 반격 태세를 갖췄습니다.');
    events.push({ type: 'counter-stance', unitId });
  } else if (skill.id === 'benevolent-banner') {
    const affected = getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= 2);
    affected.forEach((ally) => {
      ally.hp = Math.min(ally.maxHp, ally.hp + 12);
      addTimedStatus(ally, 'defenseUp', 4, 2);
      addTimedStatus(ally, 'attackUp', 3, 2);
    });
    pushLog(state, 'skill', `유비의 인의의 깃발! ${affected.length}명의 전열이 회복됩니다.`);
    events.push({ type: 'buff-area', unitId, targets: affected.map((ally) => ally.id) });
  } else if (skill.id === 'green-dragon' && target) {
    const roll = calculateDamage(state, unit, target, skill.power, false);
    const received = receiveDamage(state, target, roll.damage, unit.id);
    const dx = Math.sign(target.x - unit.x);
    const dy = Math.sign(target.y - unit.y);
    const behind = getUnitAt(state, target.x + dx, target.y + dy);
    let splash = 0;
    if (behind && behind.team !== unit.team) {
      const splashResult = receiveDamage(state, behind, Math.round(roll.damage * 0.45), unit.id);
      splash = splashResult.hpDamage;
    }
    pushLog(state, 'skill', `관우의 청룡 돌파! ${received.hpDamage} 피해${splash ? `, 관통 ${splash}` : ''}.`);
    events.push({ type: 'pierce', unitId, targetId, damage: received.hpDamage, splash });
  } else if (skill.id === 'thunder-roar') {
    const enemies = getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player').filter((enemy) => distance(unit, enemy) <= 2);
    enemies.forEach((enemy) => {
      const roll = calculateDamage(state, unit, enemy, skill.power, false);
      const received = receiveDamage(state, enemy, roll.damage, unit.id);
      if (!enemy.dead && random(state) < 0.65) enemy.status.stun = 1;
      events.push({ type: 'area-hit', unitId, targetId: enemy.id, damage: received.hpDamage });
    });
    pushLog(state, 'skill', `장비의 호통이 ${enemies.length}개 부대를 흔들었습니다.`);
  } else if (skill.id === 'silver-rescue' && target) {
    const candidates = getReachableCells(state, unit.id)
      .filter((cell) => distance(cell, target) === 1)
      .sort((a, b) => a.cost - b.cost);
    if (candidates[0]) {
      unit.x = candidates[0].x;
      unit.y = candidates[0].y;
    }
    const roll = calculateDamage(state, unit, target, skill.power, false);
    const received = receiveDamage(state, target, roll.damage, unit.id);
    getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= 1).forEach((ally) => { ally.status.shield += 8; });
    pushLog(state, 'skill', `조운의 은창 구원! ${received.hpDamage} 피해.`);
    events.push({ type: 'dash-hit', unitId, targetId, damage: received.hpDamage, to: { x: unit.x, y: unit.y } });
  } else if (skill.id === 'gate-crusher' && target) {
    const roll = calculateDamage(state, unit, target, skill.power, false);
    const received = receiveDamage(state, target, roll.damage, unit.id);
    const dx = Math.sign(target.x - unit.x);
    const dy = Math.sign(target.y - unit.y);
    const nextX = target.x + dx;
    const nextY = target.y + dy;
    let pushed = false;
    if (!target.dead && inBounds(nextX, nextY) && !terrainAt(state, nextX, nextY).blocked && !getUnitAt(state, nextX, nextY)) {
      target.x = nextX;
      target.y = nextY;
      pushed = true;
    } else if (!target.dead) {
      target.status.stun = Math.max(target.status.stun, 1);
    }
    pushLog(state, 'skill', `화웅의 관문 쇄도! ${received.hpDamage} 피해${pushed ? '와 밀쳐내기' : '와 기절'}.`);
    events.push({ type: 'push-hit', unitId, targetId, damage: received.hpDamage, pushed, to: pushed ? { x: nextX, y: nextY } : null });
  } else if (skill.id === 'black-feather' && target) {
    const roll = calculateDamage(state, unit, target, skill.power, true);
    const received = receiveDamage(state, target, roll.damage, unit.id);
    if (!target.dead) {
      target.status.root = Math.max(target.status.root, 2);
      target.status.attackDown = Math.max(target.status.attackDown, 6);
    }
    pushLog(state, 'skill', `가후의 흑우의 계! ${received.hpDamage} 피해, 이동 봉쇄와 공격 약화.`);
    events.push({ type: 'skill-hit', unitId, targetId, damage: received.hpDamage, status: 'root-attack-down' });
  } else if (skill.id === 'sky-piercer' && target) {
    const roll = calculateDamage(state, unit, target, skill.power, false);
    const received = receiveDamage(state, target, roll.damage, unit.id);
    const splashes = [];
    getLivingUnits(state, target.team)
      .filter((candidate) => candidate.id !== target.id && distance(candidate, target) === 1)
      .forEach((candidate) => {
        const splash = receiveDamage(state, candidate, Math.max(4, Math.round(roll.damage * 0.35)), unit.id, { ignoreGuard: true });
        splashes.push({ targetId: candidate.id, damage: splash.hpDamage });
      });
    unit.status.shield += 10;
    pushLog(state, 'skill', `여포의 방천화극! ${received.hpDamage} 피해${splashes.length ? `, 주변 ${splashes.length}개 부대에 충격` : ''}.`);
    events.push({ type: 'area-pierce', unitId, targetId, damage: received.hpDamage, splashes, shield: 10 });
  } else if (skill.id === 'tyrant-order') {
    const allies = getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= 2);
    const enemies = getLivingUnits(state, unit.team === 'player' ? 'enemy' : 'player').filter((enemy) => distance(unit, enemy) <= 2);
    allies.forEach((ally) => {
      addTimedStatus(ally, 'attackUp', 5, 2);
      addTimedStatus(ally, 'defenseUp', 3, 2);
      addTimedStatus(ally, 'speedUp', 2, 2);
    });
    enemies.forEach((enemy) => { enemy.status.attackDown = Math.max(enemy.status.attackDown, 4); });
    unit.status.shield += 12;
    pushLog(state, 'skill', `동탁의 폭군의 호령! 서량군 ${allies.length}개 부대가 강화되고 적군 ${enemies.length}개 부대가 위축됩니다.`);
    events.push({ type: 'tyrant-order', unitId, allies: allies.map((ally) => ally.id), enemies: enemies.map((enemy) => enemy.id), shield: 12 });
  } else {
    return { ok: false, state: inputState, message: '아직 구현되지 않은 기술입니다.' };
  }

  unit.firstAttack = false;
  markActed(state, unit);
  checkOutcome(state);
  return { ok: true, state, event: { type: 'skill', unitId, targetId, skillId: skill.id, events } };
}

export function waitUnit(inputState, unitId) {
  const state = clone(inputState);
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead || unit.acted) return { ok: false, state: inputState, message: '대기할 수 없습니다.' };
  markActed(state, unit);
  pushLog(state, 'wait', `${HEROES[unit.heroId].name}이(가) 대기합니다.`);
  checkOutcome(state);
  return { ok: true, state, event: { type: 'wait', unitId } };
}

function tickStatus(unit) {
  ['attackUp', 'defenseUp', 'speedUp', 'counterUp'].forEach((name) => {
    if (unit.status[name].turns > 0) unit.status[name].turns -= 1;
    if (unit.status[name].turns <= 0) {
      unit.status[name].amount = 0;
      if (name === 'counterUp') unit.status[name].range = 0;
    }
  });
  if (unit.status.stun > 0) unit.status.stun -= 1;
  if (unit.status.root > 0) unit.status.root -= 1;
  if (unit.status.taunt > 0) unit.status.taunt -= 1;
  unit.status.attackDown = Math.max(0, unit.status.attackDown - 2);
}

function applyTerrainHealing(state, team) {
  getLivingUnits(state, team).forEach((unit) => {
    const heal = terrainAt(state, unit.x, unit.y).heal ?? 0;
    if (heal > 0 && unit.hp < unit.maxHp) {
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      pushLog(state, 'heal', `${HEROES[unit.heroId].name}이(가) ${terrainAt(state, unit.x, unit.y).name}에서 ${heal} 회복했습니다.`);
    }
  });
}

function startTeamPhase(state, team) {
  getLivingUnits(state, team).forEach((unit) => {
    const wasStunned = unit.status.stun > 0;
    tickStatus(unit);
    unit.acted = wasStunned;
    unit.moved = false;
    unit.skill = Math.min(unit.skillMax, unit.skill + (unit.skillMax > 0 ? 1 : 0));
  });
  if (team === 'player') {
    const xun = getLivingUnits(state, 'player').find((unit) => unit.heroId === 'xun');
    if (xun) {
      const target = getLivingUnits(state, 'player').sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (target && target.hp < target.maxHp) target.hp = Math.min(target.maxHp, target.hp + 5);
    }
  }
  applyTerrainHealing(state, team);
}

export function startEnemyPhase(inputState) {
  const state = clone(inputState);
  if (state.result) return state;
  state.phase = 'enemy';
  state.selectedId = null;
  state.movedFrom = null;
  startTeamPhase(state, 'enemy');
  pushLog(state, 'phase', `제 ${state.turn}턴 · 적군 행동`);
  return state;
}

export function nextEnemyUnit(state) {
  return getLivingUnits(state, 'enemy')
    .filter((unit) => !unit.acted)
    .sort((a, b) => (b.speed + (b.leader ? 2 : 0)) - (a.speed + (a.leader ? 2 : 0)))[0] ?? null;
}

function targetPriority(state, enemy) {
  const players = getLivingUnits(state, 'player');
  const taunters = players.filter((unit) => unit.status.taunt > 0 && distance(unit, enemy) <= 5);
  const pool = taunters.length ? taunters : players;
  return pool.sort((a, b) => {
    const aScore = distance(enemy, a) * 10 + a.hp / a.maxHp * 7 - (a.heroId === 'cao' ? 8 : 0);
    const bScore = distance(enemy, b) * 10 + b.hp / b.maxHp * 7 - (b.heroId === 'cao' ? 8 : 0);
    return aScore - bScore;
  })[0] ?? null;
}

function potentialSkillTarget(state, unit) {
  const hero = HEROES[unit.heroId];
  if (!hero.skill || unit.skill <= 0) return null;
  const targets = getSkillTargets(state, unit.id);
  if (!targets.length) return null;
  if (hero.skill.type === 'self' || hero.skill.type === 'support' || hero.skill.type === 'area') {
    if (hero.skill.id === 'benevolent-banner') {
      const injured = getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= 2 && ally.hp / ally.maxHp < 0.72);
      return injured.length >= 2 ? unit : null;
    }
    if (hero.skill.id === 'thunder-roar') {
      const nearby = getLivingUnits(state, 'player').filter((target) => distance(unit, target) <= 2);
      return nearby.length >= 2 ? unit : null;
    }
    if (hero.skill.id === 'tyrant-order') {
      const allies = getLivingUnits(state, unit.team).filter((ally) => distance(unit, ally) <= 2);
      return state.turn === 1 || (allies.length >= 2 && unit.hp / unit.maxHp < 0.76) ? unit : null;
    }
    return unit.hp / unit.maxHp < 0.6 ? unit : null;
  }
  if (hero.skill.type === 'heal') return targets.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  return targets.sort((a, b) => a.hp - b.hp)[0];
}

export function planEnemyAction(state, unitId) {
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead || unit.acted) return { type: 'wait', unitId };
  const immediateSkill = potentialSkillTarget(state, unit);
  if (immediateSkill) return { type: 'skill', unitId, targetId: immediateSkill.id };
  const immediateTarget = getBasicAttackTargets(state, unitId).sort((a, b) => a.hp - b.hp)[0];
  if (immediateTarget) return { type: 'attack', unitId, targetId: immediateTarget.id };

  const target = targetPriority(state, unit);
  if (!target) return { type: 'wait', unitId };
  const reachable = getReachableCells(state, unitId);
  const unitClass = classData(unit);
  const desiredRange = unitClass.range[0] > 1 ? unitClass.range[0] : 1;
  const choices = reachable.map((cell) => {
    const d = distance(cell, target);
    const terrain = terrainAt(state, cell.x, cell.y);
    const rangePenalty = Math.abs(d - desiredRange) * 11;
    const exposure = getLivingUnits(state, 'player').filter((player) => distance(cell, player) <= classData(player).range[1]).length * 2;
    return { ...cell, score: rangePenalty + cell.cost - terrain.defense * 1.4 + exposure };
  }).sort((a, b) => a.score - b.score);
  const destination = choices[0] ?? { x: unit.x, y: unit.y };
  return { type: 'move-act', unitId, to: { x: destination.x, y: destination.y }, targetId: target.id };
}

export function executeEnemyAction(inputState, plan) {
  let state = clone(inputState);
  const unit = getUnit(state, plan.unitId);
  if (!unit || unit.dead || unit.acted) return { ok: false, state: inputState, message: '적 행동을 실행할 수 없습니다.' };
  const events = [];
  if (plan.type === 'move-act' && plan.to) {
    const moved = moveUnit(state, unit.id, plan.to.x, plan.to.y, { force: true, keepUndo: false });
    if (moved.ok) {
      state = moved.state;
      events.push(moved.event);
    }
    const refreshed = getUnit(state, unit.id);
    const skillTarget = potentialSkillTarget(state, refreshed);
    if (skillTarget) {
      const result = useSkill(state, refreshed.id, skillTarget.id, { force: true });
      if (result.ok) return { ok: true, state: result.state, events: [...events, result.event] };
    }
    const target = getBasicAttackTargets(state, refreshed.id).sort((a, b) => a.hp - b.hp)[0];
    if (target) {
      const result = basicAttack(state, refreshed.id, target.id, { force: true });
      if (result.ok) return { ok: true, state: result.state, events: [...events, result.event] };
    }
    const waited = waitUnit(state, refreshed.id);
    return { ok: true, state: waited.state, events: [...events, waited.event] };
  }
  if (plan.type === 'skill') return useSkill(state, unit.id, plan.targetId, { force: true });
  if (plan.type === 'attack') return basicAttack(state, unit.id, plan.targetId, { force: true });
  return waitUnit(state, unit.id);
}

export function finishEnemyPhase(inputState) {
  const state = clone(inputState);
  if (state.result) return state;
  state.turn += 1;
  if (state.turn > state.turnLimit) {
    state.result = { outcome: 'defeat', reason: 'turn-limit' };
    state.phase = 'ended';
    pushLog(state, 'bad', '제한 턴을 넘겨 진류 공략에 실패했습니다.');
    return state;
  }
  state.phase = 'player';
  startTeamPhase(state, 'player');
  pushLog(state, 'phase', `제 ${state.turn}턴 · 아군 행동`);
  checkOutcome(state);
  return state;
}

export function allUnitsActed(state, team = 'player') {
  const units = getLivingUnits(state, team);
  return units.length > 0 && units.every((unit) => unit.acted);
}

function checkOutcome(state) {
  if (state.result) return state.result;
  const leader = getLivingUnits(state, 'enemy').find((unit) => unit.heroId === state.objective.leaderHeroId);
  const cao = getLivingUnits(state, 'player').find((unit) => unit.heroId === 'cao');
  const commandOccupier = getUnitAt(state, state.objective.x, state.objective.y);
  if (!leader || (commandOccupier && commandOccupier.team === 'player')) {
    state.flags.commandCaptured = Boolean(commandOccupier && commandOccupier.team === 'player');
    state.result = { outcome: 'victory', reason: leader ? 'command-captured' : 'leader-defeated' };
    state.phase = 'ended';
    pushLog(state, 'good', leader ? '적 지휘소를 점령했습니다!' : '유비를 격파했습니다!');
  } else if (!cao || getLivingUnits(state, 'player').length === 0) {
    state.result = { outcome: 'defeat', reason: 'leader-defeated' };
    state.phase = 'ended';
    pushLog(state, 'bad', '조조가 전장에서 이탈해 퇴각합니다.');
  }
  return state.result;
}

export function selectUnit(inputState, unitId) {
  const state = clone(inputState);
  const unit = getUnit(state, unitId);
  if (!unit || unit.dead) return state;
  state.selectedId = unitId;
  state.movedFrom = null;
  return state;
}

export function clearSelection(inputState) {
  const state = clone(inputState);
  state.selectedId = null;
  state.movedFrom = null;
  return state;
}

export function battleSummary(state) {
  const players = getLivingUnits(state, 'player');
  const enemies = getLivingUnits(state, 'enemy');
  return {
    turn: state.turn,
    playerAlive: players.length,
    enemyAlive: enemies.length,
    playerHp: players.reduce((sum, unit) => sum + unit.hp, 0),
    enemyHp: enemies.reduce((sum, unit) => sum + unit.hp, 0),
    outcome: state.result?.outcome ?? null,
  };
}

export function serializeBattle(state) {
  return JSON.stringify(state);
}

export function restoreBattle(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : clone(raw);
  if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.units) || !Array.isArray(parsed.terrain)) throw new Error('지원하지 않는 전투 저장 데이터입니다.');
  return parsed;
}
