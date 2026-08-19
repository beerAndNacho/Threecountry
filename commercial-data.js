import { HEROES, PLAYER_ROSTER } from './content.js';

export const COMMERCIAL_VERSION = 1;
export const COMMERCIAL_KEY = 'threecountry:commercial:v1';

export const EQUIPMENT = {
  'bronze-sabre': { id: 'bronze-sabre', name: '청동 환도', slot: 'weapon', icon: '刀', rarity: '일반', stats: { attack: 3 }, description: '균형 잡힌 초급 무기.' },
  'cavalry-spear': { id: 'cavalry-spear', name: '기병 장창', slot: 'weapon', icon: '槍', rarity: '희귀', classes: ['cavalry'], stats: { attack: 4, speed: 1 }, description: '기병의 돌파력을 높이는 장창.' },
  'strategist-fan': { id: 'strategist-fan', name: '청옥 군선', slot: 'weapon', icon: '扇', rarity: '희귀', classes: ['strategist'], stats: { magic: 5 }, description: '책략의 위력을 끌어올리는 군선.' },
  'iron-scale': { id: 'iron-scale', name: '철린갑', slot: 'armor', icon: '甲', rarity: '희귀', stats: { hp: 14, defense: 3 }, description: '전열 장수에게 적합한 중갑.' },
  'light-lamellar': { id: 'light-lamellar', name: '경량 찰갑', slot: 'armor', icon: '鎧', rarity: '일반', stats: { hp: 8, defense: 1, speed: 2 }, description: '방어와 기동을 함께 확보한다.' },
  'scholar-robe': { id: 'scholar-robe', name: '군사 장포', slot: 'armor', icon: '袍', rarity: '희귀', classes: ['strategist'], stats: { hp: 6, defense: 2, magic: 3 }, description: '책사의 생존과 책략을 보조한다.' },
  'tiger-tally': { id: 'tiger-tally', name: '호부', slot: 'accessory', icon: '符', rarity: '희귀', stats: { attack: 2, defense: 2 }, description: '지휘권의 상징. 공방을 강화한다.' },
  'jade-seal': { id: 'jade-seal', name: '청옥 인장', slot: 'accessory', icon: '印', rarity: '희귀', stats: { magic: 3, speed: 1 }, description: '책략과 판단 속도를 높인다.' },
  'war-drum': { id: 'war-drum', name: '진군 북패', slot: 'accessory', icon: '鼓', rarity: '일반', stats: { hp: 10, attack: 1 }, description: '병력을 독려해 체력과 공격을 높인다.' },
  'imperial-sabre': { id: 'imperial-sabre', name: '의천검', slot: 'weapon', icon: '劍', rarity: '영웅', stats: { attack: 6, speed: 1 }, description: '첫 장을 정복한 군주에게 내려지는 명검.' },
  'black-iron-armor': { id: 'black-iron-armor', name: '현철 중갑', slot: 'armor', icon: '玄', rarity: '영웅', stats: { hp: 20, defense: 5, speed: -1 }, description: '기동을 희생해 압도적인 생존력을 얻는다.' },
  'phoenix-talisman': { id: 'phoenix-talisman', name: '봉황 부절', slot: 'accessory', icon: '鳳', rarity: '영웅', stats: { attack: 2, magic: 4 }, description: '무력과 책략을 동시에 끌어올린다.' },
};

export const STARTER_INVENTORY = [
  'bronze-sabre', 'cavalry-spear', 'strategist-fan', 'iron-scale', 'light-lamellar',
  'scholar-robe', 'tiger-tally', 'jade-seal', 'war-drum',
];

export const STARTER_LOADOUTS = {
  cao: { weapon: 'bronze-sabre', armor: 'light-lamellar', accessory: 'tiger-tally' },
  xiahou: { weapon: 'bronze-sabre', armor: 'iron-scale', accessory: 'war-drum' },
  dian: { weapon: 'bronze-sabre', armor: 'iron-scale', accessory: 'tiger-tally' },
  xun: { weapon: 'strategist-fan', armor: 'scholar-robe', accessory: 'jade-seal' },
  guo: { weapon: 'strategist-fan', armor: 'scholar-robe', accessory: 'jade-seal' },
  xu: { weapon: 'bronze-sabre', armor: 'iron-scale', accessory: 'war-drum' },
};

export function xpForLevel(level) {
  return 70 + Math.max(0, Number(level || 1) - 1) * 45;
}

export function defaultCommercialMeta() {
  return {
    version: COMMERCIAL_VERSION,
    progression: Object.fromEntries(PLAYER_ROSTER.map((heroId) => [heroId, { level: 1, xp: 0 }])),
    inventory: [...STARTER_INVENTORY],
    loadouts: structuredClone(STARTER_LOADOUTS),
    lootHistory: [],
    rewardKeys: [],
    mastery: 0,
    battles: 0,
    lastGrowth: null,
    selectedHero: 'cao',
  };
}

export function normalizeCommercialMeta(value = {}) {
  const base = defaultCommercialMeta();
  return {
    ...base,
    ...value,
    version: COMMERCIAL_VERSION,
    progression: { ...base.progression, ...(value.progression || {}) },
    loadouts: { ...base.loadouts, ...(value.loadouts || {}) },
    inventory: [...new Set([...(base.inventory || []), ...(value.inventory || [])])],
    rewardKeys: [...new Set(value.rewardKeys || [])].slice(-30),
    lootHistory: [...new Set(value.lootHistory || [])],
  };
}

export function loadCommercialMeta(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(COMMERCIAL_KEY);
    return normalizeCommercialMeta(raw ? JSON.parse(raw) : {});
  } catch {
    return defaultCommercialMeta();
  }
}

export function saveCommercialMeta(meta, storage = globalThis.localStorage) {
  const normalized = normalizeCommercialMeta(meta);
  try { storage?.setItem?.(COMMERCIAL_KEY, JSON.stringify(normalized)); } catch {}
  return normalized;
}

export function equipmentStats(heroId, meta) {
  const totals = { hp: 0, attack: 0, defense: 0, magic: 0, speed: 0 };
  Object.values(meta?.loadouts?.[heroId] || {}).filter(Boolean).forEach((itemId) => {
    const stats = EQUIPMENT[itemId]?.stats || {};
    Object.entries(stats).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + Number(value || 0); });
  });
  return totals;
}

export function heroGrowthStats(heroId, meta) {
  const hero = HEROES[heroId];
  if (!hero) return null;
  const growth = meta?.progression?.[heroId] || { level: 1, xp: 0 };
  const step = Math.max(0, Number(growth.level || 1) - 1);
  const gear = equipmentStats(heroId, meta);
  const stats = {
    hp: hero.maxHp + step * 4 + gear.hp,
    attack: hero.attack + Math.floor(step * 1.2) + gear.attack,
    defense: hero.defense + Math.floor(step * 0.9) + gear.defense,
    magic: hero.magic + Math.floor(step * 1.1) + gear.magic,
    speed: hero.speed + Math.floor(step * 0.35) + gear.speed,
  };
  return { ...stats, level: growth.level, xp: growth.xp, score: stats.hp + stats.attack * 4 + stats.defense * 3 + stats.magic * 3 + stats.speed * 2 };
}

export function applyExperience(meta, heroId, amount) {
  const normalized = normalizeCommercialMeta(meta);
  const growth = normalized.progression[heroId] ||= { level: 1, xp: 0 };
  growth.xp += Number(amount || 0);
  let levels = 0;
  while (growth.level < 20 && growth.xp >= xpForLevel(growth.level)) {
    growth.xp -= xpForLevel(growth.level);
    growth.level += 1;
    levels += 1;
  }
  return { meta: normalized, levels, growth };
}
