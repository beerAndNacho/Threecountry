import { HEROES, SAVE_KEY } from './content.js';
import { CHAPTER_TWO_MAPS, CHAPTER_TWO_OPERATIONS, CHAPTER_TWO_VERSION, validateChapterTwo } from './chapter-two-content-v1.js';

const META_KEY = 'threecountry:chapter-two:v1';
const CHAPTER_ONE_META_KEY = 'threecountry:operation-campaign:v1';
const BASE_OPERATION_VERSION = '1.0.0';
const BASE_MAP_VERSION = '1.1.0';
const DIFFICULTIES = {
  story: { id: 'story', name: '이야기', enemy: 0.88, player: 1.08, reward: 0.9, turnAdjust: 1 },
  normal: { id: 'normal', name: '군웅', enemy: 1, player: 1, reward: 1, turnAdjust: 0 },
  hard: { id: 'hard', name: '난세', enemy: 1.12, player: 1, reward: 1.25, turnAdjust: 0 },
  legend: { id: 'legend', name: '천명', enemy: 1.24, player: 0.98, reward: 1.55, turnAdjust: -1 },
};
const BRIEFINGS = {
  'hulao-scout': {
    speaker: 'xiahou', title: '관문을 넘는 세 가지 길', text: '화웅은 정면의 힘을 믿는다. 어느 방식으로 그 믿음을 무너뜨릴 것인가.',
    choices: [
      { id: 'flank', name: '곽가의 숲길 우회', description: '책사 기술력 +1, 첫 턴 이동 +1.', flag: 'flank', fame: 2 },
      { id: 'duel', name: '하후돈의 정면 도전', description: '하후돈 공격 +5, 시작 보호막 12.', flag: 'duel', fame: 4 },
      { id: 'protect', name: '피난 행렬부터 통과', description: '전원 HP +8%, 명성 +8.', flag: 'protect', fame: 8, grain: -60 },
    ],
  },
  'poisoned-dispatch': {
    speaker: 'guo', title: '가후의 전령망을 끊어라', text: '진짜 전령은 하나뿐이다. 나머지는 우리를 늪으로 끌어들이기 위한 미끼다.',
    choices: [
      { id: 'counterplot', name: '거짓 전령을 되돌려 보낸다', description: '가후 기술력 -1, 아군 책사 마력 +4.', flag: 'counterplot', fame: 3 },
      { id: 'burn', name: '역참을 불태워 길을 끊는다', description: '적 기병 속도 -2, 군량 -50.', flag: 'burn', grain: -50 },
      { id: 'capture', name: '전령을 생포해 정보를 얻는다', description: '첫 턴 적 전원 이동 봉쇄, 금 -80.', flag: 'capture', gold: -80 },
    ],
  },
  'flying-general': {
    speaker: 'cao', title: '여포를 이기는 방법', text: '그보다 강한 장수는 없다. 그렇다면 강함이 향하는 방향을 우리가 정해야 한다.',
    choices: [
      { id: 'bait', name: '전위가 미끼가 된다', description: '전위 보호막 24, 여포 공격 -4.', flag: 'bait', fame: 4 },
      { id: 'encircle', name: '방원진으로 포위한다', description: '전원 방어 +3, 이동 -1.', flag: 'encircle', fame: 2 },
      { id: 'race', name: '조조가 직접 속도로 겨룬다', description: '조조 속도 +4, 공격 +4, HP -12.', flag: 'race', fame: 7 },
    ],
  },
  'burning-luoyang': {
    speaker: 'xun', title: '낙양의 불길 앞에서', text: '황궁을 얻더라도 백성을 잃으면 승리가 아니다. 그러나 불길을 끄는 동안 동탁은 달아날 것이다.',
    choices: [
      { id: 'rescue', name: '주민 탈출로를 먼저 연다', description: '전원 회복 18, 제한 턴 +1, 명성 +12.', flag: 'rescue', fame: 12, grain: -80 },
      { id: 'palace', name: '황궁으로 곧장 진격한다', description: '첫 공격 피해 +18%, 제한 턴 -1.', flag: 'palace', fame: 3 },
      { id: 'cutoff', name: '동탁의 퇴로를 끊는다', description: '여포·가후 이동 봉쇄 1턴, 금 -100.', flag: 'cutoff', gold: -100 },
    ],
  },
};

let queued = false;
let reloadPending = false;
let modalOpen = false;
const errors = validateChapterTwo();
if (errors.length) console.error('Chapter two validation failed', errors);

const parse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const readSave = () => parse(localStorage.getItem(SAVE_KEY), null);
const writeSave = (save) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } };
function defaultMeta() {
  return { version: CHAPTER_TWO_VERSION, selected: 'hulao-scout', difficulty: 'normal', cleared: {}, stars: {}, bestTurns: {}, attempts: {}, processed: [], choices: {}, history: [], completed: false };
}
function readMeta() {
  const raw = parse(localStorage.getItem(META_KEY), {});
  const base = defaultMeta();
  return {
    ...base, ...raw, version: CHAPTER_TWO_VERSION,
    cleared: { ...base.cleared, ...(raw.cleared || {}) }, stars: { ...base.stars, ...(raw.stars || {}) },
    bestTurns: { ...base.bestTurns, ...(raw.bestTurns || {}) }, attempts: { ...base.attempts, ...(raw.attempts || {}) },
    choices: { ...base.choices, ...(raw.choices || {}) }, processed: [...new Set(raw.processed || [])].slice(-80),
    history: Array.isArray(raw.history) ? raw.history.slice(0, 80) : [],
  };
}
function writeMeta(meta) { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {} return meta; }
function chapterOneComplete() {
  const meta = parse(localStorage.getItem(CHAPTER_ONE_META_KEY), {});
  return Boolean(meta.cleared?.['chenliu-command'] || (meta.stars?.['chenliu-command'] || 0) >= 1 || new URLSearchParams(location.search).get('chapter') === '2');
}
const operationById = (id) => CHAPTER_TWO_OPERATIONS.find((operation) => operation.id === id) || CHAPTER_TWO_OPERATIONS[0];
const difficultyById = (id) => DIFFICULTIES[id] || DIFFICULTIES.normal;
function unlocked(meta, operation) {
  if (!chapterOneComplete()) return false;
  if (operation.order === 1) return true;
  const previous = CHAPTER_TWO_OPERATIONS.find((candidate) => candidate.order === operation.order - 1);
  return Boolean(previous && (meta.stars[previous.id] || 0) >= 1);
}
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const stars = (value = 0) => `${'★'.repeat(value)}${'☆'.repeat(Math.max(0, 3 - value))}`;
function heroPortrait(heroId) {
  const hero = HEROES[heroId];
  return hero ? `<svg class="hero-portrait story c2v1-portrait" viewBox="0 0 180 220" role="img" aria-label="${esc(hero.name)}"></svg>` : '';
}
function operationCard(operation, meta) {
  const open = unlocked(meta, operation);
  const selected = meta.selected === operation.id;
  return `<article class="c2v1-operation ${selected ? 'selected' : ''} ${open ? '' : 'locked'}" data-c2v1-operation="${operation.id}">
    <div class="c2v1-map" data-weather="${operation.weatherId}">${CHAPTER_TWO_MAPS[operation.id].terrain.flat().map((tile) => `<i class="${tile}"></i>`).join('')}<b>${operation.icon}</b></div>
    <header><div><small>OPERATION ${operation.chapter} · ${operation.label}</small><h3>${esc(operation.name)}</h3></div><strong>${stars(meta.stars[operation.id] || 0)}</strong></header>
    <p>${esc(operation.description)}</p><dl><div><dt>목표</dt><dd>${esc(operation.objective)}</dd></div><div><dt>환경</dt><dd>${operation.weather}</dd></div><div><dt>제한</dt><dd>${operation.turnLimit}턴 · 기준 ${operation.par}턴</dd></div></dl>
    <footer><span>${meta.bestTurns[operation.id] ? `최고 ${meta.bestTurns[operation.id]}턴` : operation.bonus}</span><button data-c2v1-select="${operation.id}" ${open ? '' : 'disabled'}>${open ? selected ? '선택됨' : '작전 선택' : '제1장 또는 이전 작전 필요'}</button></footer>
  </article>`;
}
function boardMarkup(meta) {
  const selected = operationById(meta.selected);
  const open = chapterOneComplete();
  return `<section class="c2v1-board" data-c2v1-board>
    <div class="c2v1-heading"><div><small>CHAPTER 2 · LUOYANG ROAD</small><h2>낙양으로 가는 불길</h2><p>화웅·가후·여포·동탁이 서로 다른 전술과 이야기를 가진 네 작전으로 등장합니다.</p></div><span><small>장 진행</small><b>${Object.values(meta.cleared).filter(Boolean).length}/4</b></span></div>
    ${open ? '' : '<div class="c2v1-lock"><b>제1장 진류 본진 결전 1★ 필요</b><p>상용 알파 검수자는 주소에 <code>?chapter=2</code>를 붙여 직접 체험할 수 있습니다.</p></div>'}
    <div class="c2v1-route">${CHAPTER_TWO_OPERATIONS.map((operation, index) => `<i class="${unlocked(meta, operation) ? 'open' : ''} ${meta.cleared[operation.id] ? 'cleared' : ''}">${index + 1}</i>${index < 3 ? '<b></b>' : ''}`).join('')}</div>
    <div class="c2v1-grid">${CHAPTER_TWO_OPERATIONS.map((operation) => operationCard(operation, meta)).join('')}</div>
    <div class="c2v1-command"><div><small>선택 작전</small><b>${selected.chapter} · ${esc(selected.name)}</b><p>${esc(selected.objective)}</p></div><label><span>난이도</span><select data-c2v1-difficulty>${Object.values(DIFFICULTIES).map((item) => `<option value="${item.id}" ${meta.difficulty === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}</select></label><button data-c2v1-start ${unlocked(meta, selected) ? '' : 'disabled'}><small>출전 회의</small><b>작전 선택으로 이동 →</b></button></div>
  </section>`;
}
function injectBoard() {
  const hub = document.querySelector('.hub-screen');
  if (!hub || hub.querySelector('[data-c2v1-board]')) return;
  const target = hub.querySelector('[data-ocv1-board],.facility-section');
  if (target) target.insertAdjacentHTML('afterend', boardMarkup(readMeta()));
  else hub.insertAdjacentHTML('beforeend', boardMarkup(readMeta()));
}
function openBriefing() {
  if (modalOpen) return;
  const meta = readMeta();
  const operation = operationById(meta.selected);
  if (!unlocked(meta, operation)) return;
  const briefing = BRIEFINGS[operation.id];
  modalOpen = true;
  const modal = document.createElement('div');
  modal.className = 'c2v1-modal';
  modal.dataset.operation = operation.id;
  modal.innerHTML = `<div class="c2v1-backdrop" data-c2v1-close></div><section><header><div><small>${operation.chapter} · ${esc(operation.name)}</small><b>${esc(briefing.title)}</b></div><button data-c2v1-close>×</button></header><div class="c2v1-story"><aside>${heroPortrait(briefing.speaker)}<span>${esc(HEROES[briefing.speaker]?.name || '')}</span></aside><article><p>${esc(briefing.text)}</p><div>${briefing.choices.map((choice) => `<button data-c2v1-choice="${choice.id}"><b>${esc(choice.name)}</b><span>${esc(choice.description)}</span></button>`).join('')}</div></article></div><footer><span>선택은 전투 시작 능력치와 연대기에 저장됩니다.</span><button data-c2v1-close>돌아가기</button></footer></section>`;
  document.body.append(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
}
function closeModal() {
  const modal = document.querySelector('.c2v1-modal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { modal.remove(); modalOpen = false; }, 220);
}
function chooseBriefing(choiceId) {
  const meta = readMeta();
  const operation = operationById(document.querySelector('.c2v1-modal')?.dataset.operation || meta.selected);
  const choice = BRIEFINGS[operation.id]?.choices.find((candidate) => candidate.id === choiceId);
  const save = readSave();
  if (!choice || !save) return;
  save.resources.gold = Math.max(0, (save.resources.gold || 0) + (choice.gold || 0));
  save.resources.grain = Math.max(0, (save.resources.grain || 0) + (choice.grain || 0));
  save.resources.fame = Math.max(0, (save.resources.fame || 0) + (choice.fame || 0));
  save.battle = null;
  save.chapterCleared = false;
  save.screen = 'deployment';
  save.operation = { id: operation.id, difficulty: meta.difficulty, chapter: 2, version: CHAPTER_TWO_VERSION };
  save.chapterTwoOperation = { id: operation.id, choice: choice.flag, difficulty: meta.difficulty, version: CHAPTER_TWO_VERSION };
  meta.choices[operation.id] = choice.flag;
  meta.attempts[operation.id] = (meta.attempts[operation.id] || 0) + 1;
  meta.history.unshift({ at: Date.now(), type: 'briefing', operationId: operation.id, choice: choice.flag });
  writeMeta(meta); writeSave(save); closeModal(); location.reload();
}
function cleanStatus() {
  return { shield: 0, stun: 0, root: 0, taunt: 0, attackDown: 0, attackUp: { amount: 0, turns: 0 }, defenseUp: { amount: 0, turns: 0 }, speedUp: { amount: 0, turns: 0 }, counterUp: { amount: 0, range: 0, turns: 0 } };
}
function makeUnit(heroId, index, position, scale, leader = false) {
  const hero = HEROES[heroId];
  return {
    id: `enemy-c2-${heroId}-${index}`, heroId, team: 'enemy', x: position.x, y: position.y,
    maxHp: Math.round(hero.maxHp * scale), hp: Math.round(hero.maxHp * scale), attack: Math.round(hero.attack * scale),
    defense: Math.round(hero.defense * scale), magic: Math.round(hero.magic * scale), speed: Math.max(1, Math.round(hero.speed * (1 + (scale - 1) * 0.45))),
    skill: hero.skillMax ? 1 : 0, skillMax: hero.skillMax || 0, acted: false, moved: false, dead: false, leader,
    firstAttack: true, status: cleanStatus(),
  };
}
function scaleUnit(unit, multiplier) {
  unit.maxHp = Math.max(1, Math.round(unit.maxHp * multiplier)); unit.hp = Math.max(1, Math.round(unit.hp * multiplier));
  unit.attack = Math.max(1, Math.round(unit.attack * multiplier)); unit.defense = Math.max(0, Math.round(unit.defense * multiplier));
  unit.magic = Math.max(0, Math.round(unit.magic * multiplier)); unit.speed = Math.max(1, Math.round(unit.speed * (1 + (multiplier - 1) * 0.45)));
}
function applyChoice(battle, choice) {
  const players = battle.units.filter((unit) => unit.team === 'player');
  const enemy = (id) => battle.units.find((unit) => unit.heroId === id && unit.team === 'enemy');
  const player = (id) => players.find((unit) => unit.heroId === id);
  if (choice === 'flank') { players.forEach((unit) => { unit.speed += 1; }); players.filter((unit) => HEROES[unit.heroId]?.classId === 'strategist').forEach((unit) => { unit.skill = Math.min(unit.skillMax, unit.skill + 1); }); }
  if (choice === 'duel') { const unit = player('xiahou'); if (unit) { unit.attack += 5; unit.status.shield += 12; } }
  if (choice === 'protect') players.forEach((unit) => { unit.maxHp = Math.round(unit.maxHp * 1.08); unit.hp = unit.maxHp; });
  if (choice === 'counterplot') { const unit = enemy('jiaxu'); if (unit) unit.skill = Math.max(0, unit.skill - 1); players.filter((u) => HEROES[u.heroId]?.classId === 'strategist').forEach((u) => { u.magic += 4; }); }
  if (choice === 'burn') battle.units.filter((u) => u.team === 'enemy' && HEROES[u.heroId]?.classId === 'cavalry').forEach((u) => { u.speed = Math.max(1, u.speed - 2); });
  if (choice === 'capture') battle.units.filter((u) => u.team === 'enemy').forEach((u) => { u.status.root = 1; });
  if (choice === 'bait') { const unit = player('dian'); if (unit) unit.status.shield += 24; const boss = enemy('lubu'); if (boss) boss.attack = Math.max(1, boss.attack - 4); }
  if (choice === 'encircle') players.forEach((unit) => { unit.defense += 3; unit.speed = Math.max(1, unit.speed - 1); });
  if (choice === 'race') { const unit = player('cao'); if (unit) { unit.speed += 4; unit.attack += 4; unit.hp = Math.max(1, unit.hp - 12); } }
  if (choice === 'rescue') { players.forEach((unit) => { unit.hp = Math.min(unit.maxHp, unit.hp + 18); }); battle.turnLimit += 1; }
  if (choice === 'palace') { players.forEach((unit) => { unit.attack = Math.round(unit.attack * 1.18); }); battle.turnLimit = Math.max(7, battle.turnLimit - 1); }
  if (choice === 'cutoff') ['lubu', 'jiaxu'].forEach((id) => { const unit = enemy(id); if (unit) unit.status.root = 1; });
}
function applyBattle() {
  const save = readSave();
  const id = save?.chapterTwoOperation?.id;
  const battle = save?.battle;
  const map = CHAPTER_TWO_MAPS[id];
  if (!battle || battle.result || !map || battle.flags?.chapterTwoVersion === CHAPTER_TWO_VERSION) return false;
  const operation = operationById(id);
  const difficulty = difficultyById(save.chapterTwoOperation.difficulty);
  battle.flags ||= {};
  battle.flags.operationVersion = BASE_OPERATION_VERSION;
  battle.flags.operationMapVersion = BASE_MAP_VERSION;
  battle.flags.operationId = '';
  battle.flags.chapterTwoVersion = CHAPTER_TWO_VERSION;
  battle.flags.chapterTwoId = id;
  battle.flags.chapterTwoDifficulty = difficulty.id;
  battle.flags.chapterTwoChoice = save.chapterTwoOperation.choice;
  battle.terrain = structuredClone(map.terrain); battle.width = 12; battle.height = 8;
  battle.objective = { ...map.objective };
  battle.turnLimit = Math.max(7, operation.turnLimit + difficulty.turnAdjust);
  battle.operation = { id, name: operation.name, objective: operation.objective, bonus: operation.bonus, mapName: map.name, weather: map.weather, special: map.special };
  const players = battle.units.filter((unit) => unit.team === 'player');
  players.forEach((unit, index) => {
    const position = map.playerSpawns[index]; if (position) { unit.x = position.x; unit.y = position.y; }
    scaleUnit(unit, difficulty.player);
  });
  const enemies = map.enemySpawns.map((spawn, index) => {
    let scale = operation.enemyScale * difficulty.enemy;
    if (operation.elite?.includes(spawn.heroId)) scale *= operation.eliteScale || 1;
    return makeUnit(spawn.heroId, index, spawn, scale, Boolean(spawn.leader));
  });
  battle.units = [...players, ...enemies];
  applyChoice(battle, save.chapterTwoOperation.choice);
  battle.log = [{ turn: 1, tone: 'story', text: `${operation.chapter} ${operation.name} · ${operation.weather}. ${operation.description}` }, ...(battle.log || [])];
  writeSave(save);
  return true;
}
function bossPhases() {
  const save = readSave();
  const battle = save?.battle;
  const id = battle?.flags?.chapterTwoId;
  if (!battle || battle.result || !id) return false;
  battle.flags.chapterTwoEvents ||= {};
  let changed = false;
  const enemy = (heroId) => battle.units.find((unit) => unit.team === 'enemy' && unit.heroId === heroId && !unit.dead && unit.hp > 0);
  if (id === 'hulao-scout' && !battle.flags.chapterTwoEvents.gateShield) {
    const boss = enemy('huaxiong'); if (boss) { boss.status.shield += 18; battle.flags.chapterTwoEvents.gateShield = true; changed = true; }
  }
  if (id === 'poisoned-dispatch' && battle.turn >= 3 && !battle.flags.chapterTwoEvents.poisonFog) {
    battle.units.filter((u) => u.team === 'player' && !u.dead).forEach((u) => { u.status.attackDown += 4; });
    battle.log.unshift({ turn: battle.turn, tone: 'bad', text: '가후의 독안개가 퍼져 아군 공격력이 낮아졌습니다.' });
    battle.flags.chapterTwoEvents.poisonFog = true; changed = true;
  }
  if (id === 'flying-general' && !battle.flags.chapterTwoEvents.unmatched) {
    const boss = enemy('lubu');
    if (boss && boss.hp <= boss.maxHp * 0.5) {
      boss.attack += 7; boss.speed += 2; boss.status.shield += 16; boss.hp = Math.min(boss.maxHp, boss.hp + 18);
      battle.log.unshift({ turn: battle.turn, tone: 'bad', text: '여포가 비장의 기세를 드러냈습니다. 공격·속도·보호막이 강화됩니다.' });
      battle.flags.chapterTwoEvents.unmatched = true; changed = true;
    }
  }
  if (id === 'burning-luoyang') {
    const boss = enemy('dongzhuo');
    const shieldTurn = battle.flags.chapterTwoEvents.tyrantShieldTurn || 0;
    if (boss && battle.phase === 'player' && shieldTurn !== battle.turn) { boss.status.shield += 8; battle.flags.chapterTwoEvents.tyrantShieldTurn = battle.turn; changed = true; }
    const map = CHAPTER_TWO_MAPS[id];
    if (battle.turn >= map.reinforcements.turn && !battle.flags.chapterTwoEvents.reinforced) {
      const occupied = new Set(battle.units.filter((u) => !u.dead && u.hp > 0).map((u) => `${u.x},${u.y}`));
      map.reinforcements.units.forEach((spawn, index) => {
        if (!occupied.has(`${spawn.x},${spawn.y}`)) battle.units.push(makeUnit(spawn.heroId, 20 + index, spawn, operationById(id).enemyScale * difficultyById(battle.flags.chapterTwoDifficulty).enemy, false));
      });
      battle.log.unshift({ turn: battle.turn, tone: 'bad', text: '불타는 성문에서 서량군 증원이 도착했습니다.' });
      battle.flags.chapterTwoEvents.reinforced = true; changed = true;
    }
  }
  if (id === 'flying-general' && battle.result?.reason === 'command-captured' && enemy('lubu')) {
    battle.result = null; battle.phase = 'player'; battle.log.unshift({ turn: battle.turn, tone: 'bad', text: '여포가 살아 있는 동안 지휘소 점령만으로 승리할 수 없습니다.' }); changed = true;
  }
  if (changed) writeSave(save);
  return changed;
}
function fingerprint(save) {
  const battle = save?.battle;
  return battle?.result && battle.flags?.chapterTwoId ? [battle.flags.chapterTwoId, battle.flags.chapterTwoDifficulty, battle.result.outcome, battle.result.reason, battle.turn, save.records?.victories || 0, save.records?.defeats || 0].join(':') : '';
}
const survivors = (battle) => battle.units.filter((unit) => unit.team === 'player' && !unit.dead && unit.hp > 0).length;
function calculateStars(operation, battle) {
  if (battle.result.outcome !== 'victory') return 0;
  let value = 1; if (battle.turn <= operation.par) value += 1; if (survivors(battle) === 4) value += 1; return Math.min(3, value);
}
function processResult() {
  const save = readSave(); const key = fingerprint(save); if (!key) return false;
  const meta = readMeta(); if (meta.processed.includes(key)) return false;
  const battle = save.battle; const operation = operationById(battle.flags.chapterTwoId); const difficulty = difficultyById(battle.flags.chapterTwoDifficulty);
  const value = calculateStars(operation, battle); const victory = battle.result.outcome === 'victory';
  if (victory) {
    meta.cleared[operation.id] = true; meta.stars[operation.id] = Math.max(meta.stars[operation.id] || 0, value);
    meta.bestTurns[operation.id] = Math.min(meta.bestTurns[operation.id] || Infinity, battle.turn);
    const next = CHAPTER_TWO_OPERATIONS.find((candidate) => candidate.order === operation.order + 1); if (next) meta.selected = next.id;
    const scale = difficulty.reward * (1 + Math.max(0, value - 1) * 0.1);
    save.resources.gold += Math.round(operation.rewards.gold * scale); save.resources.grain += Math.round(operation.rewards.grain * scale); save.resources.fame += Math.round(operation.rewards.fame * scale);
    if (operation.order === 4) { meta.completed = true; save.chapterTwoCleared = true; }
  }
  meta.processed.push(key); meta.history.unshift({ at: Date.now(), type: 'result', operationId: operation.id, outcome: battle.result.outcome, stars: value, turn: battle.turn, survivors: survivors(battle) });
  writeMeta(meta); writeSave(save); return true;
}
function resultMarkup(save) {
  const meta = readMeta(); const battle = save.battle; const operation = operationById(battle.flags.chapterTwoId); const value = calculateStars(operation, battle);
  const next = CHAPTER_TWO_OPERATIONS.find((candidate) => candidate.order === operation.order + 1);
  return `<article class="c2v1-result" data-c2v1-result><div><small>CHAPTER 2 RESULT · ${operation.chapter}</small><h2>${esc(operation.name)}</h2><p>${battle.result.outcome === 'victory' ? '낙양으로 향하는 길이 열렸습니다. 선택과 전공이 제2장 연대기에 기록됩니다.' : '작전은 실패했습니다. 장비·시설·편성을 조정해 재도전하십시오.'}</p></div><strong>${stars(value)}</strong><dl><div><dt>소요 턴</dt><dd>${battle.turn}/${battle.turnLimit}</dd></div><div><dt>생존</dt><dd>${survivors(battle)}/4</dd></div><div><dt>다음</dt><dd>${battle.result.outcome === 'victory' ? next?.name || '제2장 완료' : operation.name}</dd></div></dl><button data-c2v1-back>낙양 작전 지도로 돌아가기 →</button></article>`;
}
function injectResult() {
  const root = document.querySelector('.result-screen'); const save = readSave();
  if (!root || root.querySelector('[data-c2v1-result]') || !save?.battle?.flags?.chapterTwoId || !save.battle.result) return;
  const target = root.querySelector('.commercial-result-card,.result-grid'); if (target) target.insertAdjacentHTML('afterend', resultMarkup(save)); else root.insertAdjacentHTML('beforeend', resultMarkup(save));
}
function injectBriefing() {
  const save = readSave(); const id = save?.chapterTwoOperation?.id; const operation = operationById(id);
  if (!id) return;
  const root = document.querySelector('.deployment-screen,.battle-screen,.battlefield-shell');
  if (!root || root.querySelector('[data-c2v1-brief]')) return;
  const target = root.querySelector('.page-hero,.battle-topbar,.battle-toolbar,.deployment-layout');
  const markup = `<section class="c2v1-brief" data-c2v1-brief><div><small>CHAPTER 2 · ${operation.weather}</small><b>${operation.chapter} ${esc(operation.name)}</b><p>${esc(operation.description)}</p></div><span>${operation.icon}</span></section>`;
  if (target) target.insertAdjacentHTML('afterend', markup); else root.insertAdjacentHTML('afterbegin', markup);
}
function returnHub() {
  const save = readSave(); if (!save) return;
  save.screen = 'hub'; save.battle = null; writeSave(save); location.reload();
}
function expose() {
  const meta = readMeta();
  window.__chapterTwoV1 = { ready: true, version: CHAPTER_TWO_VERSION, operationCount: CHAPTER_TWO_OPERATIONS.length, heroCount: 6, validationErrors: [...errors], selected: meta.selected, cleared: Object.values(meta.cleared).filter(Boolean).length, completed: meta.completed };
}
function enhance() {
  queued = false; document.documentElement.classList.add('chapter-two-v1-ready');
  injectBoard();
  if (applyBattle() && !reloadPending) { reloadPending = true; setTimeout(() => location.reload(), 70); return; }
  if (bossPhases() && !reloadPending) { reloadPending = true; setTimeout(() => location.reload(), 80); return; }
  if (processResult() && !reloadPending) { reloadPending = true; setTimeout(() => location.reload(), 80); return; }
  injectBriefing(); injectResult(); expose();
}
function schedule() { if (queued) return; queued = true; requestAnimationFrame(enhance); }
document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null; if (!target) return;
  const select = target.closest('[data-c2v1-select]');
  if (select) { const meta = readMeta(); const operation = operationById(select.dataset.c2v1Select); if (!unlocked(meta, operation)) return; meta.selected = operation.id; writeMeta(meta); document.querySelector('[data-c2v1-board]')?.remove(); schedule(); return; }
  if (target.closest('[data-c2v1-start]')) { openBriefing(); return; }
  const choice = target.closest('[data-c2v1-choice]'); if (choice) { chooseBriefing(choice.dataset.c2v1Choice); return; }
  if (target.closest('[data-c2v1-close]')) { closeModal(); return; }
  if (target.closest('[data-c2v1-back]')) returnHub();
}, true);
document.addEventListener('change', (event) => {
  const select = event.target instanceof HTMLSelectElement && event.target.matches('[data-c2v1-difficulty]') ? event.target : null; if (!select) return;
  const meta = readMeta(); meta.difficulty = difficultyById(select.value).id; writeMeta(meta); document.querySelector('[data-c2v1-board]')?.remove(); schedule();
}, true);
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
schedule();
