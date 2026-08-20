import { SAVE_KEY, HEROES } from './content.js';

const VERSION = '1.0.0';
const META_KEY = 'threecountry:operation-campaign:v1';
const DIFFICULTIES = {
  story: { id: 'story', name: '이야기', enemy: 0.88, player: 1.08, reward: 0.9, turnAdjust: 1, description: '스토리와 캐릭터를 편하게 감상합니다.' },
  normal: { id: 'normal', name: '군웅', enemy: 1, player: 1, reward: 1, turnAdjust: 0, description: '처음 권장하는 표준 난이도입니다.' },
  hard: { id: 'hard', name: '난세', enemy: 1.12, player: 1, reward: 1.25, turnAdjust: 0, description: '적의 공방과 속도가 강화됩니다.' },
  legend: { id: 'legend', name: '천명', enemy: 1.22, player: 0.98, reward: 1.55, turnAdjust: -1, description: '짧은 턴 안에 완벽한 편성과 운용이 필요합니다.' },
};
const OPERATIONS = [
  {
    id: 'west-road', order: 1, chapter: '1-1', name: '서쪽 난민로', label: '정찰전', icon: '路', danger: 1,
    description: '유민 행렬을 보호하며 진류 서쪽 길목의 적 정찰대를 밀어냅니다.',
    objective: '유비군의 지휘 체계를 무너뜨리십시오.', turnLimit: 11, par: 8,
    enemyScale: 0.9, playerShield: 8, rewards: { gold: 120, grain: 100, fame: 7 },
    bonus: '아군 전원 생존',
  },
  {
    id: 'village-bell', order: 2, chapter: '1-2', name: '마을의 종', label: '구조전', icon: '里', danger: 2,
    description: '동쪽 마을을 지키며 관우와 장비의 양면 압박을 버텨야 합니다.',
    objective: '9턴 안에 승리하고 마을의 보급을 지키십시오.', turnLimit: 10, par: 8,
    enemyScale: 1, playerShield: 4, rewards: { gold: 170, grain: 130, fame: 10 },
    bonus: '8턴 이내 승리',
  },
  {
    id: 'guan-line', order: 3, chapter: '1-3', name: '관우의 방진', label: '정예전', icon: '義', danger: 3,
    description: '강화된 관우와 장비를 상대로 병종 상성과 지형을 정확히 활용합니다.',
    objective: '정예 선봉을 돌파하고 유비의 지휘소를 압박하십시오.', turnLimit: 9, par: 7,
    enemyScale: 1.08, elite: ['guan', 'zhang'], eliteScale: 1.18, rewards: { gold: 230, grain: 160, fame: 14 },
    bonus: '조조 HP 50% 이상',
  },
  {
    id: 'chenliu-command', order: 4, chapter: '1-4', name: '진류 본진 결전', label: '장 결전', icon: '陣', danger: 4,
    description: '유비군 전원이 강화됩니다. 전투·스토리·성장 시스템을 모두 활용하는 첫 장 결전입니다.',
    objective: '유비 격파 또는 적 지휘소 점령.', turnLimit: 12, par: 8,
    enemyScale: 1.15, elite: ['liu', 'guan', 'zhang', 'zhao'], eliteScale: 1.12, playerSkill: 1,
    rewards: { gold: 340, grain: 240, fame: 22 }, bonus: '8턴 이내·전원 생존',
  },
];

let queued = false;
let reloadPending = false;

const parse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const readSave = () => parse(localStorage.getItem(SAVE_KEY), null);
const writeSave = (save) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } };
function defaultMeta() {
  return {
    version: VERSION,
    selected: 'west-road',
    difficulty: 'normal',
    cleared: {},
    stars: {},
    bestTurns: {},
    attempts: {},
    processed: [],
    history: [],
  };
}
function readMeta() {
  const raw = parse(localStorage.getItem(META_KEY), {});
  const base = defaultMeta();
  return {
    ...base,
    ...raw,
    version: VERSION,
    cleared: { ...base.cleared, ...(raw.cleared || {}) },
    stars: { ...base.stars, ...(raw.stars || {}) },
    bestTurns: { ...base.bestTurns, ...(raw.bestTurns || {}) },
    attempts: { ...base.attempts, ...(raw.attempts || {}) },
    processed: [...new Set(raw.processed || [])].slice(-60),
    history: Array.isArray(raw.history) ? raw.history.slice(0, 60) : [],
  };
}
function writeMeta(meta) { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {} return meta; }
const operationById = (id) => OPERATIONS.find((operation) => operation.id === id) || OPERATIONS[0];
const difficultyById = (id) => DIFFICULTIES[id] || DIFFICULTIES.normal;
function unlocked(meta, operation) {
  if (operation.order === 1) return true;
  const previous = OPERATIONS.find((candidate) => candidate.order === operation.order - 1);
  return Boolean(previous && (meta.stars[previous.id] || 0) >= 1);
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function starText(value = 0) { return `${'★'.repeat(value)}${'☆'.repeat(Math.max(0, 3 - value))}`; }
function currentScreen() {
  if (document.querySelector('.result-screen')) return 'result';
  if (document.querySelector('.battle-screen,.battlefield-shell')) return 'battle';
  if (document.querySelector('.deployment-screen')) return 'deployment';
  if (document.querySelector('.hub-screen')) return 'hub';
  return '';
}
function operationCard(operation, meta) {
  const isUnlocked = unlocked(meta, operation);
  const selected = meta.selected === operation.id;
  const stars = meta.stars[operation.id] || 0;
  const best = meta.bestTurns[operation.id];
  return `<article class="ocv1-operation ${selected ? 'selected' : ''} ${isUnlocked ? '' : 'locked'}" data-ocv1-operation="${operation.id}">
    <header><span>${operation.icon}</span><div><small>OPERATION ${operation.chapter} · ${operation.label}</small><h3>${esc(operation.name)}</h3></div><b>${starText(stars)}</b></header>
    <p>${esc(operation.description)}</p>
    <dl><div><dt>목표</dt><dd>${esc(operation.objective)}</dd></div><div><dt>제한</dt><dd>${operation.turnLimit}턴 · 기준 ${operation.par}턴</dd></div><div><dt>위험</dt><dd>${'◆'.repeat(operation.danger)}${'◇'.repeat(4 - operation.danger)}</dd></div></dl>
    <footer><span>${best ? `최고 기록 ${best}턴` : operation.bonus}</span><button data-ocv1-select="${operation.id}" ${isUnlocked ? '' : 'disabled'} type="button">${isUnlocked ? selected ? '선택됨' : '작전 선택' : '이전 작전 필요'}</button></footer>
  </article>`;
}
function boardMarkup(meta) {
  const selected = operationById(meta.selected);
  const difficulty = difficultyById(meta.difficulty);
  return `<section class="ocv1-board" data-ocv1-board>
    <div class="ocv1-heading"><div><small>CHAPTER 1 · OPERATION MAP</small><h2>진류 작전 지도</h2><p>한 번의 전투가 아니라 네 개의 작전을 차례로 돌파하며 장수·장비·연대기를 성장시킵니다.</p></div><span><small>장 진행</small><b>${Object.values(meta.cleared).filter(Boolean).length}/${OPERATIONS.length}</b></span></div>
    <div class="ocv1-route">${OPERATIONS.map((operation, index) => `<i class="${unlocked(meta, operation) ? 'open' : ''} ${meta.cleared[operation.id] ? 'cleared' : ''}">${index + 1}</i>${index < OPERATIONS.length - 1 ? '<b></b>' : ''}`).join('')}</div>
    <div class="ocv1-grid">${OPERATIONS.map((operation) => operationCard(operation, meta)).join('')}</div>
    <div class="ocv1-command"><div><small>선택 작전</small><b>${esc(selected.name)}</b><p>${esc(selected.objective)}</p></div><label><span>난이도</span><select data-ocv1-difficulty>${Object.values(DIFFICULTIES).map((item) => `<option value="${item.id}" ${meta.difficulty === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}</select><em>${esc(difficulty.description)}</em></label><button data-ocv1-start type="button"><small>출전 준비</small><b>${selected.chapter} 작전 시작 →</b></button></div>
  </section>`;
}
function injectBoard() {
  const hub = document.querySelector('.hub-screen');
  if (!hub || hub.querySelector('[data-ocv1-board]')) return;
  const meta = readMeta();
  const target = hub.querySelector('.commercial-growth-section,.facility-section');
  if (target) target.insertAdjacentHTML('afterend', boardMarkup(meta));
  else hub.insertAdjacentHTML('beforeend', boardMarkup(meta));
}
function startOperation() {
  const meta = readMeta();
  const operation = operationById(meta.selected);
  if (!unlocked(meta, operation)) return;
  const save = readSave();
  if (!save) return;
  save.battle = null;
  save.chapterCleared = false;
  save.screen = 'deployment';
  save.settings = { ...(save.settings || {}), difficulty: 'normal' };
  save.operation = { id: operation.id, difficulty: meta.difficulty, version: VERSION };
  meta.attempts[operation.id] = (meta.attempts[operation.id] || 0) + 1;
  writeMeta(meta);
  writeSave(save);
  location.reload();
}
function scaleUnit(unit, multiplier) {
  unit.maxHp = Math.max(1, Math.round(unit.maxHp * multiplier));
  unit.hp = Math.max(1, Math.round(unit.hp * multiplier));
  unit.attack = Math.max(1, Math.round(unit.attack * multiplier));
  unit.defense = Math.max(0, Math.round(unit.defense * multiplier));
  unit.magic = Math.max(0, Math.round(unit.magic * multiplier));
  unit.speed = Math.max(1, Math.round(unit.speed * (1 + (multiplier - 1) * 0.45)));
}
function applyBattleModifiers() {
  const save = readSave();
  if (!save?.battle || save.battle.result || save.battle.flags?.operationVersion === VERSION) return;
  const meta = readMeta();
  const operation = operationById(save.operation?.id || meta.selected);
  const difficulty = difficultyById(save.operation?.difficulty || meta.difficulty);
  const battle = save.battle;
  battle.flags ||= {};
  battle.flags.operationVersion = VERSION;
  battle.flags.operationId = operation.id;
  battle.flags.operationDifficulty = difficulty.id;
  battle.operation = { id: operation.id, name: operation.name, objective: operation.objective, bonus: operation.bonus };
  battle.turnLimit = Math.max(6, operation.turnLimit + difficulty.turnAdjust);
  battle.units.filter((unit) => unit.team === 'enemy').forEach((unit) => {
    let scale = operation.enemyScale * difficulty.enemy;
    if (operation.elite?.includes(unit.heroId)) scale *= operation.eliteScale || 1;
    scaleUnit(unit, scale);
  });
  battle.units.filter((unit) => unit.team === 'player').forEach((unit) => {
    scaleUnit(unit, difficulty.player);
    if (operation.playerShield) unit.status.shield = (unit.status.shield || 0) + operation.playerShield;
    if (operation.playerSkill && unit.skillMax > 0) unit.skill = Math.min(unit.skillMax, unit.skill + operation.playerSkill);
  });
  battle.log.unshift({ turn: battle.turn, tone: 'story', text: `${operation.chapter} ${operation.name} · ${difficulty.name} 난이도 작전이 시작되었습니다.` });
  writeSave(save);
  if (!reloadPending) {
    reloadPending = true;
    setTimeout(() => location.reload(), 60);
  }
}
function resultFingerprint(save) {
  const battle = save?.battle;
  if (!battle?.result || !battle.flags?.operationId) return '';
  return [battle.flags.operationId, battle.flags.operationDifficulty, battle.result.outcome, battle.result.reason, battle.turn, save.records?.victories || 0, save.records?.defeats || 0].join(':');
}
function survivors(battle) { return battle.units.filter((unit) => unit.team === 'player' && !unit.dead && unit.hp > 0).length; }
function calculateStars(operation, save) {
  const battle = save.battle;
  if (battle.result.outcome !== 'victory') return 0;
  let stars = 1;
  if (battle.turn <= operation.par) stars += 1;
  if (survivors(battle) === 4) stars += 1;
  return Math.min(3, stars);
}
function processResult() {
  const save = readSave();
  const key = resultFingerprint(save);
  if (!key) return;
  const meta = readMeta();
  if (meta.processed.includes(key)) return;
  const battle = save.battle;
  const operation = operationById(battle.flags.operationId);
  const difficulty = difficultyById(battle.flags.operationDifficulty);
  const stars = calculateStars(operation, save);
  const victory = battle.result.outcome === 'victory';
  if (victory) {
    meta.cleared[operation.id] = true;
    meta.stars[operation.id] = Math.max(meta.stars[operation.id] || 0, stars);
    meta.bestTurns[operation.id] = Math.min(meta.bestTurns[operation.id] || Infinity, battle.turn);
    const next = OPERATIONS.find((candidate) => candidate.order === operation.order + 1);
    if (next) meta.selected = next.id;
    const rewardScale = difficulty.reward * (1 + Math.max(0, stars - 1) * 0.1);
    save.resources.gold += Math.round(operation.rewards.gold * rewardScale);
    save.resources.grain += Math.round(operation.rewards.grain * rewardScale);
    save.resources.fame += Math.round(operation.rewards.fame * rewardScale);
  }
  meta.processed.push(key);
  meta.processed = meta.processed.slice(-60);
  meta.history.unshift({ at: Date.now(), operationId: operation.id, difficulty: difficulty.id, outcome: battle.result.outcome, stars, turn: battle.turn, survivors: survivors(battle) });
  meta.history = meta.history.slice(0, 60);
  writeMeta(meta);
  writeSave(save);
  if (!reloadPending) {
    reloadPending = true;
    setTimeout(() => location.reload(), 80);
  }
}
function resultMarkup(save, meta) {
  const battle = save.battle;
  const operation = operationById(battle.flags.operationId);
  const difficulty = difficultyById(battle.flags.operationDifficulty);
  const stars = calculateStars(operation, save);
  const next = OPERATIONS.find((candidate) => candidate.order === operation.order + 1);
  return `<article class="ocv1-result" data-ocv1-result><div><small>OPERATION RESULT · ${operation.chapter}</small><h2>${esc(operation.name)}</h2><p>${battle.result.outcome === 'victory' ? '작전 성공. 별과 보상이 장 진행도에 기록됐습니다.' : '작전 실패. 성장과 장비를 조정한 뒤 다시 도전할 수 있습니다.'}</p></div><strong>${starText(stars)}</strong><dl><div><dt>난이도</dt><dd>${difficulty.name}</dd></div><div><dt>소요 턴</dt><dd>${battle.turn}/${battle.turnLimit}</dd></div><div><dt>생존 장수</dt><dd>${survivors(battle)}/4</dd></div><div><dt>다음 작전</dt><dd>${battle.result.outcome === 'victory' ? next?.name || '제1장 완료' : operation.name}</dd></div></dl><button data-ocv1-back-hub type="button">작전 지도로 돌아가기 →</button></article>`;
}
function injectResult() {
  const root = document.querySelector('.result-screen');
  if (!root || root.querySelector('[data-ocv1-result]')) return;
  const save = readSave();
  if (!save?.battle?.result || !save.battle.flags?.operationId) return;
  const meta = readMeta();
  const target = root.querySelector('.commercial-result-card,.result-grid');
  if (target) target.insertAdjacentHTML('afterend', resultMarkup(save, meta));
  else root.insertAdjacentHTML('beforeend', resultMarkup(save, meta));
}
function returnHub() {
  const save = readSave();
  if (!save) return;
  save.screen = 'hub';
  save.battle = null;
  save.chapterCleared = false;
  writeSave(save);
  location.reload();
}
function expose() {
  const meta = readMeta();
  window.__operationCampaignV1 = {
    ready: true,
    version: VERSION,
    operations: OPERATIONS.map((operation) => ({ ...operation, unlocked: unlocked(meta, operation), stars: meta.stars[operation.id] || 0 })),
    selected: meta.selected,
    difficulty: meta.difficulty,
    cleared: Object.values(meta.cleared).filter(Boolean).length,
  };
}
function enhance() {
  queued = false;
  document.documentElement.classList.add('operation-campaign-v1-ready');
  injectBoard();
  applyBattleModifiers();
  processResult();
  injectResult();
  expose();
}
function schedule() { if (queued) return; queued = true; requestAnimationFrame(enhance); }
document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const select = target.closest('[data-ocv1-select]');
  if (select) {
    const meta = readMeta();
    const operation = operationById(select.dataset.ocv1Select);
    if (!unlocked(meta, operation)) return;
    meta.selected = operation.id;
    writeMeta(meta);
    document.querySelector('[data-ocv1-board]')?.remove();
    schedule();
    return;
  }
  if (target.closest('[data-ocv1-start]')) { startOperation(); return; }
  if (target.closest('[data-ocv1-back-hub]')) { returnHub(); }
}, true);
document.addEventListener('change', (event) => {
  const select = event.target instanceof HTMLSelectElement && event.target.matches('[data-ocv1-difficulty]') ? event.target : null;
  if (!select) return;
  const meta = readMeta();
  meta.difficulty = difficultyById(select.value).id;
  writeMeta(meta);
  document.querySelector('[data-ocv1-board]')?.remove();
  schedule();
}, true);
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
schedule();
