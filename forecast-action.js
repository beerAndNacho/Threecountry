import { CLASSES, HEROES, PLAYER_ROSTER, STRATEGIES, TERRAIN } from './content.js';
import { heroGrowthStats, loadCommercialMeta } from './commercial-data.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function syncCommercialHeroStats(meta = loadCommercialMeta()) {
  PLAYER_ROSTER.forEach((heroId) => {
    const growth = heroGrowthStats(heroId, meta);
    if (!growth || !HEROES[heroId]) return;
    HEROES[heroId].maxHp = growth.hp;
    HEROES[heroId].attack = growth.attack;
    HEROES[heroId].defense = growth.defense;
    HEROES[heroId].magic = growth.magic;
    HEROES[heroId].speed = growth.speed;
  });
  return meta;
}

function unit(state, unitId) {
  return state?.units?.find((candidate) => candidate.id === unitId) || null;
}

function living(state, team) {
  return state.units.filter((candidate) => !candidate.dead && candidate.hp > 0 && (!team || candidate.team === team));
}

function terrainAt(state, target) {
  return TERRAIN[state.terrain?.[target.y]?.[target.x]] || TERRAIN.grass;
}

function classData(target) {
  return CLASSES[HEROES[target.heroId]?.classId];
}

function advantage(attacker, defender) {
  const attackClass = classData(attacker);
  const defendClass = HEROES[defender.heroId]?.classId;
  if (attackClass?.strong === defendClass) return 1.2;
  if (attackClass?.weak === defendClass) return 0.85;
  return 1;
}

function auraDefense(state, target) {
  return living(state, target.team).reduce((value, ally) => {
    if (ally.id === target.id || distance(ally, target) > 1) return value;
    if (ally.heroId === 'xu') value += 3;
    if (ally.heroId === 'liu') value += 2;
    return value;
  }, 0);
}

function effectiveAttack(target) {
  const up = target.status?.attackUp?.turns > 0 ? target.status.attackUp.amount : 0;
  return Math.max(1, target.attack + up - (target.status?.attackDown || 0));
}

function effectiveDefense(state, target) {
  const up = target.status?.defenseUp?.turns > 0 ? target.status.defenseUp.amount : 0;
  let value = target.defense + up + auraDefense(state, target) + (terrainAt(state, target).defense || 0);
  if (target.heroId === 'xiahou' && target.hp <= target.maxHp / 2) value += 6;
  return Math.max(0, value);
}

function canCounter(state, defender, attacker) {
  if (defender.dead || defender.status?.stun > 0) return false;
  const range = classData(defender)?.range || [1, 1];
  const counterRange = range[1] + (defender.status?.counterUp?.turns > 0 ? defender.status.counterUp.range : 0);
  const d = distance(defender, attacker);
  return d >= range[0] && d <= counterRange;
}

function guardFor(state, target) {
  if (target.heroId !== 'cao') return null;
  return living(state, target.team).find((ally) => ally.heroId === 'dian' && distance(ally, target) === 1 && ally.hp > 1) || null;
}

function damageBounds(state, attacker, defender, multiplier = 1, magic = false) {
  const offense = magic ? attacker.magic : effectiveAttack(attacker);
  let defense = effectiveDefense(state, defender);
  if (attacker.heroId === 'guan' && attacker.firstAttack) defense *= 0.8;
  const academy = attacker.team === 'player' && magic ? 1 + ((state.facilities?.academy || 1) - 1) * 0.05 : 1;
  const classMultiplier = magic ? 1 : advantage(attacker, defender);
  const strategy = state.strategyId === 'assault' && attacker.team === 'player' && attacker.firstAttack ? 1 + STRATEGIES.assault.bonuses.firstDamage : 1;
  let criticalChance = 0.08 + Math.max(0, attacker.speed - defender.speed) * 0.008;
  if (attacker.heroId === 'guo' && attacker.firstAttack) criticalChance += 0.35;
  criticalChance = clamp(criticalChance, 0, 0.95);
  const raw = (offense * 1.3 - defense * 0.72 + 8) * multiplier * academy * classMultiplier * strategy;
  return {
    minDamage: Math.max(4, Math.round(raw * 0.92)),
    maxDamage: Math.max(4, Math.round(raw * 1.08)),
    criticalMax: Math.max(4, Math.round(raw * 1.08 * 1.45)),
    criticalChance,
    advantage: classMultiplier,
  };
}

export function forecastAction(state, attackerId, targetId, options = {}) {
  const attacker = unit(state, attackerId);
  const target = unit(state, targetId);
  if (!attacker || !target || attacker.dead || target.dead) return { ok: false, message: '예측 대상을 확인할 수 없습니다.' };
  const hero = HEROES[attacker.heroId];
  const skill = options.skill ? hero?.skill : null;
  if (skill && ['self', 'support', 'area'].includes(skill.type)) {
    return { ok: true, kind: 'utility', attackerHeroId: attacker.heroId, targetHeroId: target.heroId, skillName: skill.name, description: skill.description, skillCost: skill.cost || 1 };
  }
  if (skill?.type === 'heal') {
    const academy = 1 + ((state.facilities?.academy || 1) - 1) * 0.05;
    const amount = Math.round((skill.power + attacker.magic * 0.45) * academy);
    return { ok: true, kind: 'heal', attackerHeroId: attacker.heroId, targetHeroId: target.heroId, skillName: skill.name, skillCost: skill.cost || 1, amount };
  }
  const bounds = damageBounds(state, attacker, target, skill?.power || 1, Boolean(skill?.magic));
  let counter = null;
  if (!skill && canCounter(state, target, attacker)) {
    const multiplier = 0.68 + (target.status?.counterUp?.turns > 0 ? target.status.counterUp.amount : 0);
    const counterBounds = damageBounds(state, target, attacker, multiplier, false);
    counter = { minDamage: counterBounds.minDamage, maxDamage: counterBounds.maxDamage, criticalChance: Math.round(counterBounds.criticalChance * 100) };
  }
  const shield = target.status?.shield || 0;
  const terrain = terrainAt(state, target);
  return {
    ok: true,
    kind: skill ? 'skill-attack' : 'attack',
    attackerHeroId: attacker.heroId,
    targetHeroId: target.heroId,
    skillName: skill?.name || '',
    skillCost: skill?.cost || 0,
    hitChance: 100,
    criticalChance: Math.round(bounds.criticalChance * 100),
    minDamage: Math.max(0, bounds.minDamage - shield),
    maxDamage: Math.max(0, bounds.maxDamage - shield),
    criticalMax: Math.max(0, bounds.criticalMax - shield),
    advantage: bounds.advantage,
    advantageLabel: skill?.magic ? '책략 공격' : bounds.advantage > 1 ? '병종 우위' : bounds.advantage < 1 ? '병종 열위' : '병종 보통',
    terrain,
    shield,
    guardedBy: guardFor(state, target)?.heroId || '',
    lethal: bounds.maxDamage >= target.hp + shield,
    counter,
  };
}

syncCommercialHeroStats();
