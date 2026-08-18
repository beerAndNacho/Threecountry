import { HEROES, SAVE_KEY } from './content.js';

const FX_KEY = 'threecountry:srpg:fx:v4';
const VERSION = '0.4.0';
const heroByName = new Map(Object.entries(HEROES).map(([id, hero]) => [hero.name, id]));

let lastUnits = new Map();
let scheduled = false;
let pendingAction = null;
let lastPhase = '';
let lastScreen = '';
let lastWeather = '';
let eventCooldown = 0;

const STORY_EVENTS = [
  {
    id: 'village-smoke',
    priority: 20,
    speaker: 'xun',
    eyebrow: 'BATTLE EVENT · 진류 남촌',
    title: '논두렁 너머로 피난민이 몰려온다',
    text: '유비군과 조조군 사이에 낀 농가에서 연기가 오른다. 전열을 늦추면 백성을 피신시킬 수 있지만, 적은 다리 쪽 진형을 먼저 잡을 것이다.',
    when: (save) => save.battle?.phase === 'player' && save.battle.turn >= 2,
    choices: [
      { id: 'protect', label: '백성을 숲길로 피신시킨다', hint: '명성 +12 · 아군 전원 6 회복 · 군량 -30', tone: 'benevolent' },
      { id: 'requisition', label: '수레를 징발해 속전한다', hint: '군량 +120 · 2턴 공격 +3 · 명성 -8', tone: 'ruthless' },
    ],
  },
  {
    id: 'bridge-spy',
    priority: 18,
    speaker: 'guo',
    eyebrow: 'TACTICAL EVENT · 서교',
    title: '다리 아래에서 유비군 첩자가 발견됐다',
    text: '붙잡힌 첩자는 북쪽 숲의 매복 신호를 알고 있다. 정보를 역이용할 수도 있고, 곧장 다리를 넘어 적의 준비 시간을 빼앗을 수도 있다.',
    when: (save) => save.battle?.phase === 'player' && save.battle.turn >= 3,
    choices: [
      { id: 'counter-ambush', label: '거짓 신호로 매복을 뒤집는다', hint: '적 선봉 이동 봉쇄 · 책사 기술력 +1', tone: 'cunning' },
      { id: 'forced-march', label: '정보를 버리고 다리를 돌파한다', hint: '아군 속도 +2 · 방어막 +8', tone: 'bold' },
    ],
  },
  {
    id: 'spring-rain',
    priority: 15,
    speaker: 'xiahou',
    eyebrow: 'WEATHER EVENT · 봄비',
    title: '갑작스러운 비에 진흙이 발목을 잡는다',
    text: '부상병을 수습하면 대열을 오래 유지할 수 있다. 반대로 비가 굵어지기 전에 밀어붙이면 책략을 한 번 더 펼칠 틈이 생긴다.',
    when: (save) => save.battle?.phase === 'player' && save.battle.turn >= 5,
    choices: [
      { id: 'field-care', label: '부상병을 수습하고 숨을 고른다', hint: '가장 약한 아군 34 회복 · 군량 -50', tone: 'steady' },
      { id: 'rain-assault', label: '빗소리에 맞춰 전군을 전진시킨다', hint: '아군 공격 +2 · 기술력 +1 · HP -4', tone: 'bold' },
    ],
  },
  {
    id: 'wounded-oath',
    priority: 30,
    speaker: 'cao',
    eyebrow: 'OFFICER EVENT · 결의',
    title: '한 장수가 피투성이가 된 채 다시 일어선다',
    text: '지금 물러나 치료하면 다음 턴을 기약할 수 있다. 그러나 전선에 남아 결의를 보인다면 주변 병사들의 기세까지 끌어올릴 것이다.',
    when: (save) => save.battle?.phase === 'player' && save.battle.units?.some((unit) => unit.team === 'player' && !unit.dead && unit.hp / unit.maxHp <= 0.4),
    choices: [
      { id: 'rescue', label: '후군으로 옮겨 치료한다', hint: '부상 장수 30 회복 · 방어 +2', tone: 'steady' },
      { id: 'oath', label: '전선에서 결의를 선포한다', hint: '부상 장수 2턴 공격 +5 · 기술력 +1', tone: 'bold' },
    ],
  },
];

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

function getFxLevel() {
  try { return localStorage.getItem(FX_KEY) || 'high'; } catch { return 'high'; }
}

function setFxLevel(level) {
  try { localStorage.setItem(FX_KEY, level); } catch {}
  document.documentElement.dataset.fxLevel = level;
}

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function copyRect(rect) {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
}

function getHeroId(element) {
  const name = element.querySelector('.unit-label b')?.textContent?.trim() || '';
  return heroByName.get(name) || '';
}

function parseHp(element) {
  const text = element.querySelector('.unit-label span')?.textContent || '';
  const hp = Number.parseInt(text.split('/')[0] || '', 10);
  return Number.isFinite(hp) ? hp : 0;
}

function collectUnits() {
  const map = new Map();
  document.querySelectorAll('.battle-unit[data-unit]').forEach((element) => {
    const rect = element.getBoundingClientRect();
    map.set(element.dataset.unit, {
      id: element.dataset.unit,
      element,
      rect: copyRect(rect),
      hp: parseHp(element),
      heroId: getHeroId(element),
      team: element.classList.contains('enemy') ? 'enemy' : 'player',
      acted: element.classList.contains('acted'),
    });
  });
  return map;
}

function ensureFxLayer() {
  let layer = document.querySelector('#v4-fx-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'v4-fx-layer';
    layer.className = 'v4-fx-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

function addFx(element, duration = 900) {
  ensureFxLayer().appendChild(element);
  window.setTimeout(() => element.remove(), duration);
  return element;
}

function spawnFloat(value, rect, tone = 'damage') {
  const element = document.createElement('b');
  element.className = `v4-float ${tone}`;
  element.textContent = tone === 'heal' ? `+${value}` : `-${value}`;
  const point = center(rect);
  element.style.left = `${point.x}px`;
  element.style.top = `${rect.top + 4}px`;
  addFx(element, 1050);
}

function spawnSparks(rect, tone = 'hit') {
  const layer = ensureFxLayer();
  const point = center(rect);
  for (let index = 0; index < 9; index += 1) {
    const spark = document.createElement('i');
    spark.className = `v4-spark ${tone}`;
    spark.style.left = `${point.x}px`;
    spark.style.top = `${point.y}px`;
    layer.appendChild(spark);
    const angle = (Math.PI * 2 * index) / 9 + Math.random() * 0.35;
    const distance = 25 + Math.random() * 35;
    spark.animate([
      { translate: '0 0', scale: '1', opacity: 1 },
      { translate: `${Math.cos(angle) * distance}px ${Math.sin(angle) * distance}px`, scale: '.2', opacity: 0 },
    ], { duration: 430 + Math.random() * 260, easing: 'cubic-bezier(.12,.8,.2,1)' });
    window.setTimeout(() => spark.remove(), 760);
  }
}

function spawnDust(fromRect, toRect, team) {
  if (getFxLevel() === 'low') return;
  const layer = ensureFxLayer();
  const from = center(fromRect);
  const to = center(toRect);
  for (let index = 0; index < 7; index += 1) {
    const ratio = index / 6;
    const dust = document.createElement('i');
    dust.className = `v4-dust ${team}`;
    dust.style.left = `${from.x + (to.x - from.x) * ratio}px`;
    dust.style.top = `${from.y + (to.y - from.y) * ratio + 12}px`;
    layer.appendChild(dust);
    dust.animate([
      { translate: '0 4px', scale: '.4', opacity: 0 },
      { translate: `${(Math.random() - .5) * 12}px -8px`, scale: '1', opacity: .7, offset: .35 },
      { translate: `${(Math.random() - .5) * 20}px -18px`, scale: '1.5', opacity: 0 },
    ], { duration: 560, delay: index * 40, easing: 'ease-out' });
    window.setTimeout(() => dust.remove(), 900);
  }
}

function spawnProjectile(fromRect, toRect, kind = 'arrow') {
  const from = center(fromRect);
  const to = center(toRect);
  const projectile = document.createElement('i');
  projectile.className = `v4-projectile ${kind}`;
  projectile.style.left = `${from.x}px`;
  projectile.style.top = `${from.y}px`;
  const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
  projectile.style.rotate = `${angle}deg`;
  addFx(projectile, 760);
  projectile.animate([
    { translate: '0 0', opacity: 1, scale: '.8' },
    { translate: `${to.x - from.x}px ${to.y - from.y}px`, opacity: 1, scale: '1.1' },
  ], { duration: 360, easing: 'cubic-bezier(.2,.75,.25,1)' });
  window.setTimeout(() => spawnSparks(toRect, kind === 'spell' ? 'magic' : 'hit'), 330);
}

function spawnSlash(rect, strong = false) {
  const slash = document.createElement('i');
  slash.className = `v4-slash ${strong ? 'strong' : ''}`;
  const point = center(rect);
  slash.style.left = `${point.x}px`;
  slash.style.top = `${point.y}px`;
  addFx(slash, 620);
  spawnSparks(rect, strong ? 'critical' : 'hit');
  const shell = document.querySelector('.battlefield-shell');
  shell?.classList.add('v4-shake');
  window.setTimeout(() => shell?.classList.remove('v4-shake'), 310);
}

function spawnSpell(rect) {
  const ring = document.createElement('i');
  ring.className = 'v4-spell-ring';
  const point = center(rect);
  ring.style.left = `${point.x}px`;
  ring.style.top = `${point.y}px`;
  addFx(ring, 880);
  spawnSparks(rect, 'magic');
}

function spawnKo(snapshot) {
  const smoke = document.createElement('div');
  smoke.className = `v4-ko ${snapshot.team}`;
  smoke.innerHTML = '<i></i><i></i><i></i><b>退</b>';
  const point = center(snapshot.rect);
  smoke.style.left = `${point.x}px`;
  smoke.style.top = `${point.y}px`;
  addFx(smoke, 1200);
}

function animateUnitChanges(current) {
  for (const [id, next] of current) {
    const previous = lastUnits.get(id);
    if (!previous) {
      next.element.animate([
        { opacity: 0, scale: '.45', translate: '0 -15px' },
        { opacity: 1, scale: '1', translate: '0 0' },
      ], { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1)' });
      continue;
    }

    const dx = previous.rect.left - next.rect.left;
    const dy = previous.rect.top - next.rect.top;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      next.element.classList.add('v4-moving');
      next.element.animate([
        { translate: `${dx}px ${dy}px`, scale: '.88' },
        { translate: '0 0', scale: '1' },
      ], { duration: 420 + Math.min(260, Math.hypot(dx, dy) * 1.4), easing: 'cubic-bezier(.18,.75,.2,1)' });
      spawnDust(previous.rect, next.rect, next.team);
      window.setTimeout(() => next.element.classList.remove('v4-moving'), 720);
    }

    if (next.hp < previous.hp) {
      spawnFloat(previous.hp - next.hp, next.rect, 'damage');
      spawnSparks(next.rect, 'hit');
      next.element.animate([
        { filter: 'brightness(2) saturate(1.4)' },
        { filter: 'brightness(.7) saturate(.6)', offset: .35 },
        { filter: 'none' },
      ], { duration: 390 });
    } else if (next.hp > previous.hp) {
      spawnFloat(next.hp - previous.hp, next.rect, 'heal');
      next.element.animate([
        { filter: 'drop-shadow(0 0 0 rgba(91,210,148,0))' },
        { filter: 'drop-shadow(0 0 18px rgba(91,210,148,.95))', offset: .5 },
        { filter: 'none' },
      ], { duration: 520 });
    }
  }

  for (const [id, previous] of lastUnits) {
    if (!current.has(id)) spawnKo(previous);
  }
}

function activeCommandMode() {
  if (document.querySelector('[data-action="command-skill"].active')) return 'skill';
  if (document.querySelector('[data-action="command-attack"].active')) return 'attack';
  return 'move';
}

function positionOfUnit(element) {
  if (!element) return null;
  const x = Number.parseInt(element.style.getPropertyValue('--x'), 10);
  const y = Number.parseInt(element.style.getPropertyValue('--y'), 10);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function unitAtCell(x, y) {
  return [...document.querySelectorAll('.battle-unit[data-unit]')].find((element) => {
    const position = positionOfUnit(element);
    return position?.x === x && position?.y === y;
  }) || null;
}

function capturePendingAction(actionElement) {
  const action = actionElement.dataset.action || '';
  const selected = document.querySelector('.battle-unit.selected');
  if (!selected) return;
  const sourceRect = copyRect(selected.getBoundingClientRect());
  const heroId = getHeroId(selected);

  if (action === 'battle-cell') {
    const x = Number(actionElement.dataset.x);
    const y = Number(actionElement.dataset.y);
    const target = unitAtCell(x, y);
    const mode = activeCommandMode();
    pendingAction = {
      type: actionElement.classList.contains('reachable') ? 'move' : actionElement.classList.contains('skill-target') ? 'skill' : actionElement.classList.contains('attackable') ? 'attack' : mode,
      heroId,
      sourceId: selected.dataset.unit,
      targetId: target?.dataset.unit || '',
      sourceRect,
      targetRect: copyRect((target || actionElement).getBoundingClientRect()),
      time: Date.now(),
    };
  } else if (action === 'select-battle-unit' && actionElement !== selected && actionElement.classList.contains('targetable')) {
    pendingAction = {
      type: activeCommandMode(), heroId, sourceId: selected.dataset.unit, targetId: actionElement.dataset.unit,
      sourceRect, targetRect: copyRect(actionElement.getBoundingClientRect()), time: Date.now(),
    };
  } else if (action === 'command-skill') {
    pendingAction = { type: 'skill', heroId, sourceId: selected.dataset.unit, targetId: selected.dataset.unit, sourceRect, targetRect: sourceRect, time: Date.now() };
  }

  if (pendingAction) window.setTimeout(() => {
    if (pendingAction && Date.now() - pendingAction.time > 900) pendingAction = null;
  }, 980);
}

function playPendingAction(current) {
  if (!pendingAction || Date.now() - pendingAction.time > 1200) { pendingAction = null; return; }
  const action = pendingAction;
  pendingAction = null;
  const source = current.get(action.sourceId)?.rect || action.sourceRect;
  const target = current.get(action.targetId)?.rect || action.targetRect;
  if (!source || !target || action.type === 'move') return;
  const hero = HEROES[action.heroId];
  const classId = hero?.classId || '';
  if (action.type === 'skill') {
    if (classId === 'strategist') spawnProjectile(source, target, 'spell');
    else if (classId === 'archer') spawnProjectile(source, target, 'arrow');
    else { spawnSlash(target, true); spawnSpell(target); }
  } else if (classId === 'archer' || classId === 'strategist') {
    spawnProjectile(source, target, classId === 'archer' ? 'arrow' : 'spell');
  } else {
    spawnSlash(target, false);
  }
}

function showPhaseBanner(phaseText) {
  if (!phaseText || document.querySelector('.battle-dialogue')) return;
  const banner = document.createElement('div');
  const enemy = phaseText.includes('ENEMY');
  banner.className = `v4-phase-sweep ${enemy ? 'enemy' : 'player'}`;
  banner.innerHTML = `<small>${enemy ? '적군의 움직임' : '아군 지휘'}</small><b>${enemy ? 'ENEMY PHASE' : 'PLAYER PHASE'}</b><i></i>`;
  document.body.appendChild(banner);
  window.setTimeout(() => banner.classList.add('show'), 20);
  window.setTimeout(() => banner.classList.remove('show'), 1050);
  window.setTimeout(() => banner.remove(), 1450);
}

function compactPortrait(heroId) {
  const hero = HEROES[heroId];
  if (!hero) return '<span class="v4-story-seal">記</span>';
  const [primary, accent, trim] = hero.colors;
  const beard = ['guan', 'zhang', 'dian', 'xu', 'cao', 'xiahou', 'liu', 'xun'].includes(heroId)
    ? `<path d="M29 48 Q44 63 59 48 Q57 71 44 77 Q31 70 29 48Z" fill="${hero.hair}"/>` : '';
  return `<svg class="v4-story-face" viewBox="0 0 88 92" aria-label="${hero.name}"><defs><radialGradient id="v4-${heroId}" cx="50%" cy="35%" r="65%"><stop stop-color="${accent}" stop-opacity=".5"/><stop offset="1" stop-color="${primary}" stop-opacity="0"/></radialGradient></defs><circle cx="44" cy="43" r="41" fill="url(#v4-${heroId})"/><path d="M10 92Q13 65 31 58Q44 51 58 58Q76 65 79 92Z" fill="${primary}"/><ellipse cx="44" cy="39" rx="19" ry="23" fill="${hero.face}"/><path d="M25 34Q27 15 44 14Q62 16 63 35Q55 25 44 25Q33 25 25 34Z" fill="${hero.hair}"/><path d="M29 25Q44 8 59 25L56 34H32Z" fill="${primary}" stroke="${trim}"/><path d="M33 40q4-3 8 0M47 40q4-3 8 0" fill="none" stroke="#34251f" stroke-width="2"/><circle cx="37" cy="41" r="1.3"/><circle cx="51" cy="41" r="1.3"/>${beard}<circle cx="17" cy="72" r="11" fill="${accent}"/><text x="17" y="76" text-anchor="middle" font-size="10" font-weight="900" fill="white">${hero.emblem}</text></svg>`;
}

function findStoryEvent(save) {
  if (!save?.battle || save.battle.result || save.battle.phase !== 'player') return null;
  if (document.querySelector('.battle-dialogue, .battle-end-overlay, .v4-story-event')) return null;
  const flags = save.storyFlags || {};
  return STORY_EVENTS
    .filter((event) => !flags[event.id] && event.when(save))
    .sort((a, b) => b.priority - a.priority)[0] || null;
}

function showStoryEvent(event) {
  if (!event || document.querySelector('.v4-story-event')) return;
  eventCooldown = Date.now();
  const overlay = document.createElement('div');
  overlay.className = 'v4-story-event';
  overlay.dataset.eventId = event.id;
  overlay.innerHTML = `<div class="v4-story-backdrop"><i></i><i></i><i></i></div><section><header>${compactPortrait(event.speaker)}<div><small>${event.eyebrow}</small><h2>${event.title}</h2></div></header><p>${event.text}</p><div class="v4-story-choices">${event.choices.map((choice) => `<button data-v4-action="story-choice" data-event="${event.id}" data-choice="${choice.id}" data-tone="${choice.tone}" type="button"><b>${choice.label}</b><span>${choice.hint}</span><i>→</i></button>`).join('')}</div><footer>선택은 현재 저장에 즉시 반영됩니다.</footer></section>`;
  document.body.appendChild(overlay);
  window.setTimeout(() => overlay.classList.add('show'), 20);
}

function applyStoryChoice(eventId, choiceId) {
  const save = readSave();
  if (!save) return;
  save.storyFlags = { ...(save.storyFlags || {}), [eventId]: choiceId };
  const battle = save.battle;
  const playerUnits = battle?.units?.filter((unit) => unit.team === 'player' && !unit.dead) || [];
  const enemyUnits = battle?.units?.filter((unit) => unit.team === 'enemy' && !unit.dead) || [];
  const ensureStatus = (unit) => {
    unit.status ||= {};
    unit.status.attackUp ||= { amount: 0, turns: 0 };
    unit.status.defenseUp ||= { amount: 0, turns: 0 };
    unit.status.speedUp ||= { amount: 0, turns: 0 };
    unit.status.shield ||= 0;
    unit.status.root ||= 0;
  };
  [...playerUnits, ...enemyUnits].forEach(ensureStatus);

  let logText = '';
  if (eventId === 'village-smoke' && choiceId === 'protect') {
    save.resources.grain = Math.max(0, (save.resources.grain || 0) - 30);
    save.resources.fame = (save.resources.fame || 0) + 12;
    playerUnits.forEach((unit) => { unit.hp = Math.min(unit.maxHp, unit.hp + 6); });
    logText = '농가의 백성을 숲길로 피신시켜 군의 명성이 올랐습니다.';
  } else if (eventId === 'village-smoke') {
    save.resources.grain = (save.resources.grain || 0) + 120;
    save.resources.fame = Math.max(0, (save.resources.fame || 0) - 8);
    playerUnits.forEach((unit) => { unit.status.attackUp = { amount: Math.max(3, unit.status.attackUp.amount || 0), turns: 2 }; });
    logText = '수레를 징발해 군량과 단기 공격력을 확보했습니다.';
  } else if (eventId === 'bridge-spy' && choiceId === 'counter-ambush') {
    const target = enemyUnits.find((unit) => !unit.leader) || enemyUnits[0];
    if (target) target.status.root = Math.max(2, target.status.root || 0);
    playerUnits.filter((unit) => unit.skillMax > 0).forEach((unit) => { unit.skill = Math.min(unit.skillMax, unit.skill + 1); });
    logText = '거짓 봉화로 적 선봉의 이동을 묶고 책략 준비를 마쳤습니다.';
  } else if (eventId === 'bridge-spy') {
    playerUnits.forEach((unit) => { unit.speed += 2; unit.status.shield += 8; });
    logText = '다리를 강행 돌파해 전군의 속도와 방어막이 올랐습니다.';
  } else if (eventId === 'spring-rain' && choiceId === 'field-care') {
    save.resources.grain = Math.max(0, (save.resources.grain || 0) - 50);
    const target = [...playerUnits].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (target) target.hp = Math.min(target.maxHp, target.hp + 34);
    logText = '봄비 속에서 부상병을 수습해 가장 위태로운 장수를 치료했습니다.';
  } else if (eventId === 'spring-rain') {
    playerUnits.forEach((unit) => {
      unit.hp = Math.max(1, unit.hp - 4);
      unit.status.attackUp = { amount: Math.max(2, unit.status.attackUp.amount || 0), turns: 2 };
      if (unit.skillMax > 0) unit.skill = Math.min(unit.skillMax, unit.skill + 1);
    });
    logText = '비가 굵어지기 전에 전군이 밀어붙여 공격과 기술력을 얻었습니다.';
  } else if (eventId === 'wounded-oath' && choiceId === 'rescue') {
    const target = [...playerUnits].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (target) { target.hp = Math.min(target.maxHp, target.hp + 30); target.defense += 2; }
    logText = '부상 장수를 후군으로 옮겨 치료하고 방어 태세를 세웠습니다.';
  } else if (eventId === 'wounded-oath') {
    const target = [...playerUnits].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (target) {
      target.status.attackUp = { amount: Math.max(5, target.status.attackUp.amount || 0), turns: 2 };
      if (target.skillMax > 0) target.skill = Math.min(target.skillMax, target.skill + 1);
    }
    logText = '부상 장수의 결의가 전열을 흔들어 깨웠습니다.';
  }

  if (battle && logText) {
    battle.log ||= [];
    battle.log.unshift({ turn: battle.turn, tone: 'story', text: logText });
  }

  if (!writeSave(save)) return;
  const overlay = document.querySelector('.v4-story-event');
  overlay?.classList.add('closing');
  window.setTimeout(() => window.location.reload(), 380);
}

function applyCouncilChoice(choiceId) {
  const save = readSave();
  if (!save) return;
  save.storyFlags = { ...(save.storyFlags || {}), 'after-war-council': choiceId };
  if (choiceId === 'relief') {
    save.resources.grain = Math.max(0, (save.resources.grain || 0) - 100);
    save.resources.fame = (save.resources.fame || 0) + 20;
  } else if (choiceId === 'fortify') {
    save.resources.gold = Math.max(0, (save.resources.gold || 0) - 120);
    save.facilities.barracks = Math.min(4, (save.facilities.barracks || 1) + 1);
  } else {
    save.resources.gold = Math.max(0, (save.resources.gold || 0) - 120);
    save.facilities.academy = Math.min(4, (save.facilities.academy || 1) + 1);
  }
  writeSave(save);
  window.location.reload();
}

function enhanceHub() {
  const hub = document.querySelector('.hub-screen');
  if (!hub || hub.dataset.v4Enhanced) return;
  hub.dataset.v4Enhanced = 'true';
  const save = readSave();
  const layout = hub.querySelector('.hub-layout');
  if (!layout) return;
  const flags = save?.storyFlags || {};
  const cleared = Boolean(save?.chapterCleared);
  const section = document.createElement('section');
  section.className = 'v4-story-road';
  section.innerHTML = cleared && !flags['after-war-council']
    ? `<div><small>AFTER WAR COUNCIL</small><h2>진류의 첫 밤, 세 가지 명령</h2><p>전투는 끝났지만 점령지는 아직 국가가 아니다. 어떤 방식으로 진류를 다스릴지 결정해야 한다.</p></div><div class="v4-council-options"><button data-v4-action="council" data-choice="relief" type="button"><b>창고를 열어 구휼</b><span>군량 -100 · 명성 +20</span></button><button data-v4-action="council" data-choice="fortify" type="button"><b>병영과 성문 정비</b><span>금 -120 · 병영 +1</span></button><button data-v4-action="council" data-choice="scholars" type="button"><b>책사와 기술자를 초빙</b><span>금 -120 · 군사부 +1</span></button></div>`
    : `<div><small>CAMPAIGN RUMORS</small><h2>${cleared ? '다음 장의 소문이 중원에 퍼진다' : '전투 전에 들려온 세 가지 소문'}</h2><p>${cleared ? '백마의 급보, 관도의 군량전, 연주의 반란이 서로 다른 다음 전장을 예고한다.' : '유비군의 민심, 북쪽 숲의 매복, 진류 창고의 군량 중 무엇이 사실인지 전장에서 확인해야 한다.'}</p></div><ol><li><i>2</i><b>백마의 급보</b><span>기병 구원전</span></li><li><i>3</i><b>관도의 군량로</b><span>보급 차단전</span></li><li><i>外</i><b>연주의 밤</b><span>선택형 방어전</span></li></ol>`;
  layout.insertAdjacentElement('afterend', section);
}

function enhanceResult() {
  const result = document.querySelector('.result-screen');
  if (!result || result.dataset.v4Enhanced) return;
  result.dataset.v4Enhanced = 'true';
  const save = readSave();
  const battle = save?.battle;
  if (!battle?.result) return;
  const survivors = battle.units?.filter((unit) => unit.team === 'player' && !unit.dead).length || 0;
  const reason = battle.result.reason === 'leader-defeated' ? '유비의 본대를 무너뜨린 정면 승리' : battle.result.reason === 'command-captured' ? '지휘소를 선점한 기동 승리' : '전열을 보존한 전술 퇴각';
  const mood = battle.turn <= 6 ? '속전' : battle.turn <= 9 ? '접전' : '장기전';
  const section = document.createElement('section');
  section.className = 'v4-war-chronicle';
  section.innerHTML = `<div><small>GENERATED CHRONICLE</small><h2>${mood}으로 기록된 진류 전투</h2></div><p><b>${reason}</b>. ${survivors}명의 아군 장수가 전장에 남았고, ${battle.turn}턴 동안 숲과 두 개의 다리를 두고 공방이 이어졌다. 이번 선택은 이후 장수 대사와 전후 회의 기록에 남는다.</p><div><span>⚔ ${battle.turn}턴</span><span>將 ${survivors}/4 생존</span><span>記 분기 기록 저장</span></div>`;
  result.querySelector('.result-grid')?.insertAdjacentElement('beforebegin', section);
}

function ensureBattleAtmosphere(save) {
  const shell = document.querySelector('.battlefield-shell');
  if (!shell) return;
  const turn = save?.battle?.turn || 1;
  const weather = turn >= 5 ? 'rain' : turn >= 3 ? 'leaves' : 'mist';
  if (lastWeather === weather && shell.querySelector('.v4-weather')) return;
  lastWeather = weather;
  shell.querySelector('.v4-weather')?.remove();
  const atmosphere = document.createElement('div');
  atmosphere.className = `v4-weather ${weather}`;
  const count = weather === 'rain' ? 28 : 16;
  atmosphere.innerHTML = Array.from({ length: count }, (_, index) => `<i style="--i:${index};--x:${(index * 37) % 100}%;--d:${(index % 7) * -.28}s"></i>`).join('');
  shell.appendChild(atmosphere);
  shell.dataset.weather = weather;
}

function enhanceBattle() {
  const battle = document.querySelector('.battle-screen');
  if (!battle) return;
  const save = readSave();
  ensureBattleAtmosphere(save);
  document.querySelectorAll('.battle-unit').forEach((unit) => {
    unit.dataset.v4 = 'compact';
    const heroId = getHeroId(unit);
    if (heroId) unit.dataset.hero = heroId;
  });

  const hudActions = battle.querySelector('.hud-actions');
  if (hudActions && !hudActions.querySelector('[data-v4-action="fx-level"]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.v4Action = 'fx-level';
    button.textContent = getFxLevel() === 'high' ? '연출 강' : '연출 절약';
    hudActions.prepend(button);
  }

  const objective = battle.querySelector('.objective-bar');
  if (objective && !objective.querySelector('.v4-battle-note')) {
    const note = document.createElement('div');
    note.className = 'v4-battle-note';
    note.innerHTML = '<i></i><span>작은 유닛은 실제 경로로 이동하며, 공격·책략·회복·퇴각 효과가 전장 위에 표시됩니다.</span>';
    objective.appendChild(note);
  }

  const phaseText = battle.querySelector('.turn-indicator small')?.textContent?.trim() || '';
  if (phaseText && phaseText !== lastPhase) {
    if (lastPhase) showPhaseBanner(phaseText);
    lastPhase = phaseText;
  }

  if (Date.now() - eventCooldown > 900) {
    const event = findStoryEvent(save);
    if (event) showStoryEvent(event);
  }
}

function enhanceTitle() {
  const title = document.querySelector('.title-screen');
  if (!title || title.querySelector('.v4-version-badge')) return;
  const badge = document.createElement('div');
  badge.className = 'v4-version-badge';
  badge.innerHTML = `<b>SRPG v${VERSION}</b><span>작은 유닛 · 경로 이동 · 전장 효과 · 분기 사건</span>`;
  title.querySelector('.title-copy')?.appendChild(badge);
}

function syncVisuals() {
  scheduled = false;
  setFxLevel(getFxLevel());
  const screen = document.documentElement.dataset.screen || '';
  if (screen !== lastScreen) {
    lastScreen = screen;
    if (screen !== 'battle') { lastUnits = new Map(); lastPhase = ''; lastWeather = ''; }
  }

  enhanceTitle();
  enhanceHub();
  enhanceResult();
  enhanceBattle();

  if (document.querySelector('.battle-screen')) {
    const current = collectUnits();
    animateUnitChanges(current);
    playPendingAction(current);
    lastUnits = new Map([...current].map(([id, snapshot]) => [id, { ...snapshot, element: null }]));
  }
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(syncVisuals);
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const actionElement = target.closest('[data-action]');
  if (actionElement) capturePendingAction(actionElement);

  const v4Action = target.closest('[data-v4-action]');
  if (!v4Action) return;
  const action = v4Action.dataset.v4Action;
  if (action === 'fx-level') {
    const next = getFxLevel() === 'high' ? 'low' : 'high';
    setFxLevel(next);
    v4Action.textContent = next === 'high' ? '연출 강' : '연출 절약';
  } else if (action === 'story-choice') {
    applyStoryChoice(v4Action.dataset.event, v4Action.dataset.choice);
  } else if (action === 'council') {
    applyCouncilChoice(v4Action.dataset.choice);
  }
}, true);

const observer = new MutationObserver(scheduleSync);
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'data-screen'] });
window.addEventListener('resize', scheduleSync, { passive: true });
window.addEventListener('scroll', () => { if (document.querySelector('.battle-screen')) scheduleSync(); }, { passive: true });
scheduleSync();
