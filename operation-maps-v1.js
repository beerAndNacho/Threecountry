import { HEROES, SAVE_KEY } from './content.js';
import { OPERATION_MAPS, OPERATION_MAP_VERSION, validateOperationMaps } from './operation-map-data.js';

let queued = false;
let reloadPending = false;
const validationErrors = validateOperationMaps();
if (validationErrors.length) console.error('Operation map validation failed', validationErrors);

const parse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const readSave = () => parse(localStorage.getItem(SAVE_KEY), null);
const writeSave = (save) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } };
const clone = (value) => structuredClone(value);

function currentMap(save) {
  const id = save?.battle?.flags?.operationId || save?.operation?.id;
  return OPERATION_MAPS[id] || null;
}

function isFreshBattle(battle) {
  if (!battle || battle.result || battle.turn !== 1 || battle.phase !== 'player') return false;
  return battle.units.filter((unit) => unit.team === 'player').every((unit) => !unit.moved && !unit.acted);
}

function repositionUnits(battle, map) {
  const players = battle.units.filter((unit) => unit.team === 'player');
  players.forEach((unit, index) => {
    const position = map.playerSpawns[index];
    if (!position) return;
    unit.x = position.x;
    unit.y = position.y;
  });
  battle.units.filter((unit) => unit.team === 'enemy').forEach((unit) => {
    const position = map.enemySpawns[unit.heroId];
    if (!position) return;
    unit.x = position.x;
    unit.y = position.y;
  });
}

function applyMap() {
  const save = readSave();
  const battle = save?.battle;
  const map = currentMap(save);
  if (!battle || !map || battle.flags?.operationMapVersion === OPERATION_MAP_VERSION) return false;
  battle.flags ||= {};
  if (!isFreshBattle(battle)) {
    battle.flags.operationMapVersion = `deferred-${OPERATION_MAP_VERSION}`;
    battle.log?.unshift({ turn: battle.turn, tone: 'story', text: `${map.name} 전장 업데이트는 다음 재도전부터 적용됩니다.` });
    writeSave(save);
    return false;
  }
  battle.terrain = clone(map.terrain);
  battle.width = 12;
  battle.height = 8;
  battle.objective = clone(map.objective);
  repositionUnits(battle, map);
  battle.operation = { ...(battle.operation || {}), mapName: map.name, weather: map.weather, special: map.special };
  battle.flags.operationMapVersion = OPERATION_MAP_VERSION;
  battle.flags.operationWeather = map.weatherId;
  battle.log?.unshift({ turn: 1, tone: 'story', text: `${map.name} · ${map.weather}. ${map.special}` });
  writeSave(save);
  return true;
}

function cleanStatus(status = {}) {
  return {
    shield: 0, stun: 0, root: 0, taunt: 0, attackDown: 0,
    attackUp: { amount: 0, turns: 0 }, defenseUp: { amount: 0, turns: 0 }, speedUp: { amount: 0, turns: 0 },
    counterUp: { amount: 0, range: 0, turns: 0 }, ...clone(status),
  };
}

function reinforcementFrom(source, heroId, index, position) {
  const hero = HEROES[heroId];
  const base = source ? clone(source) : null;
  if (!hero || !base) return null;
  return {
    ...base,
    id: `enemy-reinforcement-${heroId}-${index}`,
    heroId,
    team: 'enemy',
    x: position.x,
    y: position.y,
    maxHp: Math.max(1, Math.round(base.maxHp * 1.03)),
    hp: Math.max(1, Math.round(base.maxHp * 1.03)),
    attack: Math.max(1, Math.round(base.attack * 1.03)),
    defense: Math.max(0, Math.round(base.defense * 1.03)),
    magic: Math.max(0, Math.round(base.magic * 1.03)),
    speed: base.speed,
    skill: Math.min(base.skillMax || 0, 1),
    acted: false,
    moved: false,
    dead: false,
    leader: false,
    firstAttack: true,
    status: cleanStatus(),
  };
}

function applyReinforcements() {
  const save = readSave();
  const battle = save?.battle;
  const map = currentMap(save);
  const rule = map?.reinforcements;
  if (!battle || !rule || battle.result || battle.flags?.operationReinforcementVersion === OPERATION_MAP_VERSION) return false;
  const difficulty = battle.flags?.operationDifficulty || save.operation?.difficulty || 'normal';
  if (!rule.difficulties.includes(difficulty) || battle.turn < rule.turn) return false;
  const occupied = new Set(battle.units.filter((unit) => !unit.dead && unit.hp > 0).map((unit) => `${unit.x},${unit.y}`));
  const additions = [];
  for (const [index, definition] of rule.units.entries()) {
    if (occupied.has(`${definition.x},${definition.y}`)) continue;
    const source = battle.units.find((unit) => unit.team === 'enemy' && unit.heroId === definition.heroId);
    const unit = reinforcementFrom(source, definition.heroId, index, definition);
    if (unit) additions.push(unit);
  }
  battle.flags.operationReinforcementVersion = OPERATION_MAP_VERSION;
  if (additions.length) {
    battle.units.push(...additions);
    battle.log?.unshift({ turn: battle.turn, tone: 'bad', text: `진류 성문에서 적 증원 ${additions.length}부대가 출현했습니다.` });
  }
  writeSave(save);
  return additions.length > 0;
}

function briefingMarkup(map, screen) {
  return `<section class="omap-briefing ${screen}" data-omap-briefing>
    <div><small>TACTICAL MAP · ${map.weather}</small><b>${map.name}</b><p>${map.special}</p></div>
    <dl><div><dt>전장</dt><dd>12×8</dd></div><div><dt>목표</dt><dd>지휘소·유비</dd></div><div><dt>환경</dt><dd>${map.weather}</dd></div></dl>
  </section>`;
}

function injectUi() {
  const save = readSave();
  const map = currentMap(save);
  if (!map) return;
  const battleScreen = document.querySelector('.battle-screen,.battlefield-shell');
  if (battleScreen) {
    battleScreen.dataset.operationMap = map.id;
    battleScreen.dataset.operationWeather = map.weatherId;
    const top = battleScreen.querySelector('.battle-topbar,.battle-toolbar');
    if (top && !battleScreen.querySelector('[data-omap-briefing]')) top.insertAdjacentHTML('afterend', briefingMarkup(map, 'battle'));
  }
  const deployment = document.querySelector('.deployment-screen');
  if (deployment && !deployment.querySelector('[data-omap-briefing]')) {
    const target = deployment.querySelector('.deployment-layout,.page-hero');
    if (target) target.insertAdjacentHTML(target.classList.contains('page-hero') ? 'afterend' : 'beforebegin', briefingMarkup(map, 'deployment'));
  }
}

function expose() {
  const save = readSave();
  const map = currentMap(save);
  window.__operationMapsV1 = {
    ready: true,
    version: OPERATION_MAP_VERSION,
    mapCount: Object.keys(OPERATION_MAPS).length,
    activeMap: map?.id || null,
    validationErrors: [...validationErrors],
    layouts: Object.values(OPERATION_MAPS).map((entry) => ({ id: entry.id, name: entry.name, weather: entry.weather, rows: entry.terrain.length, columns: entry.terrain[0].length })),
  };
}

function enhance() {
  queued = false;
  document.documentElement.classList.add('operation-maps-v1-ready');
  if (applyMap() && !reloadPending) {
    reloadPending = true;
    setTimeout(() => location.reload(), 70);
    return;
  }
  if (applyReinforcements() && !reloadPending) {
    reloadPending = true;
    setTimeout(() => location.reload(), 80);
    return;
  }
  injectUi();
  expose();
}
function schedule() { if (queued) return; queued = true; requestAnimationFrame(enhance); }
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
schedule();
