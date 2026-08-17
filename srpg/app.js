import {
  CHAPTER, CLASSES, DEFAULT_PARTY, FACILITIES, GAME_VERSION, HEROES, MAP,
  PLAYER_ROSTER, SAVE_KEY, STORY, STRATEGIES, TERRAIN,
} from './content.js';
import {
  allUnitsActed, basicAttack, battleSummary, cellsInRange, clearSelection,
  createBattle, executeEnemyAction, finishEnemyPhase, getBasicAttackTargets,
  getLivingUnits, getReachableCells, getSkillTargets, getUnit, getUnitAt,
  moveUnit, nextEnemyUnit, planEnemyAction, restoreBattle, selectUnit,
  startEnemyPhase, undoMove, useSkill, waitUnit,
} from './engine.js';
import { isSoundEnabled, playSound, toggleSound } from './audio.js';

const app = document.querySelector('#app');

const defaultGame = () => ({
  version: GAME_VERSION,
  screen: 'title',
  resources: { gold: 620, grain: 540, fame: 80 },
  facilities: { barracks: 1, market: 1, granary: 1, academy: 1 },
  party: [...DEFAULT_PARTY],
  strategy: 'assault',
  formation: [...DEFAULT_PARTY],
  chapterCleared: false,
  battle: null,
  records: { victories: 0, defeats: 0, bestTurns: null },
  settings: { difficulty: 'normal', zoom: 'normal' },
});

let game = loadGame();
let ui = {
  screen: game.battle && !game.battle.result ? 'battle' : game.screen || 'title',
  storyKey: null,
  storyIndex: 0,
  afterStory: null,
  selectedParty: [...game.party],
  selectedStrategy: game.strategy,
  selectedUnitId: null,
  mode: 'move',
  busy: false,
  battleIntro: false,
  battleIntroIndex: 0,
  reportApplied: false,
  toastTimer: 0,
};

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultGame();
    const parsed = JSON.parse(raw);
    if (parsed.version !== GAME_VERSION) return defaultGame();
    if (parsed.battle) parsed.battle = restoreBattle(parsed.battle);
    return { ...defaultGame(), ...parsed, settings: { ...defaultGame().settings, ...(parsed.settings || {}) } };
  } catch {
    return defaultGame();
  }
}

function saveGame() {
  game.screen = ui.screen;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch {}
}

function resetGame() {
  game = defaultGame();
  ui = {
    ...ui,
    screen: 'title', storyKey: null, storyIndex: 0, afterStory: null,
    selectedParty: [...DEFAULT_PARTY], selectedStrategy: 'assault', selectedUnitId: null,
    mode: 'move', busy: false, battleIntro: false, battleIntroIndex: 0, reportApplied: false,
  };
  saveGame();
  render();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function heroPortrait(heroId, size = 'medium', extra = '') {
  const hero = HEROES[heroId];
  if (!hero) return '';
  const [primary, accent, trim] = hero.colors;
  const headgear = hero.headgear === 'crown'
    ? `<path d="M31 38 Q50 13 69 38 L64 50 H36Z" fill="${primary}" stroke="${trim}"/><path d="M39 34h22M50 17v22"/>`
    : hero.headgear === 'helm'
      ? `<path d="M27 47 Q29 18 50 15 Q72 19 73 47 L65 54 H35Z" fill="${primary}" stroke="${trim}"/><path d="M50 15V5M45 8h10"/>`
      : hero.headgear === 'hood'
        ? `<path d="M24 54 Q23 16 50 12 Q77 17 77 54 L66 46 Q62 27 50 25 Q37 27 34 47Z" fill="${primary}" stroke="${trim}"/>`
        : `<path d="M29 40 Q50 28 71 40 L67 48 Q50 40 33 48Z" fill="${accent}"/>`;
  const weapon = hero.weapon === 'spear'
    ? `<g class="unit-weapon"><path d="M85 11 L52 112"/><path d="M84 9 l8 12 -14 -3z" fill="${trim}"/></g>`
    : hero.weapon === 'sword'
      ? `<g class="unit-weapon"><path d="M82 20 L56 104"/><path d="M78 17 l11 6 -10 8z" fill="${trim}"/><path d="M48 87l18 6"/></g>`
      : hero.weapon === 'shield'
        ? `<g><path d="M70 72 Q94 75 89 102 Q83 117 70 122 Q56 114 52 98 Q52 78 70 72Z" fill="${primary}" stroke="${trim}"/><path d="M70 78v34M59 94h22"/></g>`
        : hero.weapon === 'scroll'
          ? `<g><path d="M52 94 q18 -7 33 0 v24 q-16 -6 -33 0z" fill="#efe2c2"/><path d="M58 100h20M58 106h17M58 112h12"/></g>`
          : hero.weapon === 'fan'
            ? `<g><path d="M52 116 Q64 76 88 96 Q80 116 52 116Z" fill="#e6dcc3" stroke="${trim}"/><path d="M57 112l26 -14M61 113l18 -22M68 114l8 -24"/></g>`
            : hero.weapon === 'bow'
              ? `<g class="unit-weapon"><path d="M81 31 Q60 64 80 101"/><path d="M80 31L80 101"/><path d="M76 62h17"/></g>`
              : `<g class="unit-weapon"><path d="M82 20 L55 112"/><path d="M77 14 q15 3 10 18 q-14 5 -17 -7z" fill="${trim}"/></g>`;
  const beard = ['guan', 'zhang', 'dian', 'xu'].includes(heroId)
    ? heroId === 'guan'
      ? `<path d="M35 65 Q50 81 65 65 Q63 99 55 120 L49 128 L42 114 Q36 93 35 65Z" fill="${hero.hair}"/>`
      : `<path d="M29 63 Q50 81 71 63 Q68 87 61 96 Q53 89 50 102 Q46 89 38 96 Q31 86 29 63Z" fill="${hero.hair}"/>`
    : ['cao', 'xiahou', 'liu', 'xun'].includes(heroId)
      ? `<path d="M40 68 Q50 78 60 68 Q58 84 50 87 Q42 84 40 68Z" fill="${hero.hair}"/>`
      : '';
  return `<svg class="hero-portrait ${size} ${extra}" viewBox="0 0 100 132" role="img" aria-label="${escapeHtml(hero.name)}">
    <defs><radialGradient id="halo-${heroId}-${size}" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="${accent}" stop-opacity=".55"/><stop offset="1" stop-color="${primary}" stop-opacity="0"/></radialGradient><linearGradient id="robe-${heroId}-${size}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
    <circle cx="50" cy="53" r="48" fill="url(#halo-${heroId}-${size})"/>
    <path d="M7 132 Q13 91 34 82 Q50 73 67 82 Q89 91 94 132Z" fill="${primary}" opacity=".86"/>
    ${weapon}
    <path d="M18 132 Q19 89 40 81 L50 92 L60 81 Q81 89 82 132Z" fill="url(#robe-${heroId}-${size})" stroke="rgba(255,255,255,.22)"/>
    <path d="M42 83L50 93L58 83L63 132H37Z" fill="rgba(255,255,255,.13)"/>
    <ellipse cx="50" cy="52" rx="22" ry="27" fill="${hero.face}"/>
    <path d="M30 46 Q31 23 50 22 Q70 23 71 46 Q62 34 50 34 Q38 34 30 46Z" fill="${hero.hair}"/>
    <g class="headgear">${headgear}</g>
    <path d="M37 53q5-4 10 0M53 53q5-4 10 0" fill="none" stroke="#382821" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="42" cy="54" r="1.5" fill="#30231f"/><circle cx="58" cy="54" r="1.5" fill="#30231f"/>
    <path d="M47 63q3 2 6 0M44 70q6 5 12 0" fill="none" stroke="#6a4134" stroke-width="1.5" stroke-linecap="round"/>
    ${beard}
    <circle cx="22" cy="108" r="14" fill="${accent}" stroke="rgba(255,255,255,.6)"/><text x="22" y="113" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">${hero.emblem}</text>
  </svg>`;
}

function statBar(label, value, max = 40) {
  return `<div class="stat-bar"><span>${label}</span><i><b style="width:${Math.min(100, value / max * 100)}%"></b></i><strong>${value}</strong></div>`;
}

function toast(message, tone = 'normal') {
  const element = document.querySelector('#toast');
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
  element.classList.add('show');
  window.clearTimeout(ui.toastTimer);
  ui.toastTimer = window.setTimeout(() => element.classList.remove('show'), 1900);
}

function render() {
  if (!app) return;
  document.documentElement.dataset.screen = ui.screen;
  if (ui.screen === 'title') app.innerHTML = renderTitle();
  else if (ui.screen === 'hub') app.innerHTML = renderHub();
  else if (ui.screen === 'story') app.innerHTML = renderStory();
  else if (ui.screen === 'roster') app.innerHTML = renderRoster();
  else if (ui.screen === 'deployment') app.innerHTML = renderDeployment();
  else if (ui.screen === 'battle') app.innerHTML = renderBattle();
  else if (ui.screen === 'result') app.innerHTML = renderResult();
  else app.innerHTML = renderTitle();
  bindDynamicInputs();
}

function topUtility() {
  return `<div class="utility-bar"><button data-action="home" type="button"><span class="seal-mini">天</span><b>천하일지</b></button><div><button data-action="toggle-sound" class="icon-button" type="button" aria-label="효과음">${isSoundEnabled() ? '🔊' : '🔇'}</button><button data-action="reset-save" class="icon-button danger" type="button" aria-label="저장 초기화">↺</button></div></div>`;
}

function renderTitle() {
  const canContinue = Boolean(game.battle || game.chapterCleared || game.records.victories || game.screen !== 'title');
  return `<main class="title-screen">
    <div class="title-clouds"><i></i><i></i><i></i></div>
    <header class="title-header"><div class="brand"><span>天</span><div><small>ORIGINAL TACTICAL CHRONICLE</small><b>천하일지</b></div></div><button data-action="toggle-sound" class="glass-button" type="button">${isSoundEnabled() ? '🔊 효과음' : '🔇 효과음'}</button></header>
    <section class="title-stage">
      <div class="title-copy"><span class="chapter-kicker">公元 190 · 中原</span><h1>장수를 고르고<br><em>전장을 움직여라</em></h1><p>도시를 운영하고 네 명의 장수를 편성한 뒤, 격자 전장에서 직접 이동·공격·책략을 지휘하는 스토리형 삼국 전술 게임.</p><div class="title-actions"><button data-action="new-game" class="primary huge" type="button"><span>새 연대기</span><b>전투를 시작한다 →</b></button>${canContinue ? `<button data-action="continue-game" class="secondary huge" type="button"><span>저장된 기록</span><b>이어하기</b></button>` : ''}</div><div class="title-features"><span>12×8 전술 격자</span><span>장수 4인 편성</span><span>스토리·도시 운영</span><span>API 비용 0원</span></div></div>
      <div class="title-cast"><article class="title-hero cao">${heroPortrait('cao','poster')}<div><small>魏</small><b>조조</b><span>기회를 만들어 승리한다</span></div></article><div class="versus-mark"><i></i><b>戰</b><i></i></div><article class="title-hero liu">${heroPortrait('liu','poster')}<div><small>蜀</small><b>유비</b><span>사람을 지켜 길을 연다</span></div></article></div>
    </section>
    <section class="title-preview"><article><span>01</span><div><small>STORY</small><b>대화와 선택으로 이어지는 장</b><p>전투 전후의 장수 대사와 도시 선택이 다음 전투 조건을 바꿉니다.</p></div></article><article><span>02</span><div><small>TACTICS</small><b>이동·지형·상성·고유기</b><p>숲, 언덕, 마을, 다리를 이용해 직접 유닛을 움직이고 공격합니다.</p></div></article><article><span>03</span><div><small>DOMAIN</small><b>전쟁 뒤에는 국가 운영</b><p>금과 군량을 병영·시장·군량창·군사부에 투자해 다음 전투를 준비합니다.</p></div></article></section>
    <footer>독자 캐릭터·UI·효과음으로 제작된 전술 수직 슬라이스 v2</footer><div id="toast" class="toast"></div>
  </main>`;
}

function startNewGame() {
  game = defaultGame();
  ui.selectedParty = [...DEFAULT_PARTY];
  ui.selectedStrategy = 'assault';
  openStory('prologue', 'roster');
}

function continueGame() {
  if (game.battle && !game.battle.result) ui.screen = 'battle';
  else ui.screen = game.chapterCleared ? 'hub' : (game.screen === 'title' ? 'hub' : game.screen);
  render();
}

function resourceHeader() {
  return `<div class="resource-row"><span><i>🪙</i><small>금</small><b>${game.resources.gold}</b></span><span><i>🌾</i><small>군량</small><b>${game.resources.grain}</b></span><span><i>🏮</i><small>명성</small><b>${game.resources.fame}</b></span></div>`;
}

function facilityCost(id) {
  const facility = FACILITIES[id];
  const level = game.facilities[id];
  return { gold: Math.round(facility.baseCost.gold * (1 + (level - 1) * 0.65)), grain: Math.round(facility.baseCost.grain * (1 + (level - 1) * 0.55)) };
}

function renderHub() {
  return `<main class="hub-screen">${topUtility()}<header class="hub-hero"><div><span>許昌 · 봄</span><h1>전쟁은 도시에서 준비된다</h1><p>${game.chapterCleared ? '진류를 확보했습니다. 시설을 정비하고 다음 원정을 준비하십시오.' : '첫 출전을 앞두고 병영과 군량을 확인하십시오.'}</p></div>${heroPortrait('cao','large')} ${resourceHeader()}</header>
    <section class="hub-layout"><div class="city-visual"><div class="city-sky"><i></i><i></i></div><div class="city-wall"><span>許昌</span><i></i><i></i><i></i></div><div class="city-streets"><b></b><b></b><b></b><b></b></div><div class="city-people"><i></i><i></i><i></i></div><div class="city-caption"><small>CITY STATUS</small><b>허창 · 치안 안정</b><span>다음 계절 예상 수입: 금 ${90 + game.facilities.market * 22} · 군량 ${110 + game.facilities.granary * 28}</span></div></div>
    <div class="chapter-panel"><div class="panel-title"><span>MAIN CHAPTER</span><h2>${CHAPTER.number}장 · ${CHAPTER.title}</h2><p>${CHAPTER.subtitle}</p></div><div class="chapter-progress"><i class="${game.chapterCleared ? 'done' : 'active'}"><b>1</b><span>진류 전투</span></i><em></em><i class="locked"><b>2</b><span>낙양 전야</span></i><em></em><i class="locked"><b>3</b><span>호뢰관</span></i></div><div class="chapter-objective"><span>승리 조건</span><b>${CHAPTER.objective}</b><small>권장 전력: 4명 · 제한 ${CHAPTER.turnLimit}턴</small></div><button data-action="open-roster" class="primary full" type="button">${game.chapterCleared ? '진류 전투 다시 하기' : '출전 장수를 고른다'} <b>→</b></button></div></section>
    <section class="facility-section"><div class="section-heading"><span>DOMAIN MANAGEMENT</span><h2>시설 운영</h2><p>시설 레벨은 전투 시작 능력치와 승리 보상에 직접 적용됩니다.</p></div><div class="facility-grid">${Object.values(FACILITIES).map((facility) => {
      const level = game.facilities[facility.id]; const cost = facilityCost(facility.id); const maxed = level >= 4;
      return `<article><span>${facility.icon}</span><div><small>Lv.${level}</small><h3>${facility.name}</h3><p>${facility.description}</p><div class="level-pips">${[1,2,3,4].map((n) => `<i class="${n <= level ? 'on' : ''}"></i>`).join('')}</div></div><button data-action="upgrade-facility" data-facility="${facility.id}" ${maxed ? 'disabled' : ''} type="button">${maxed ? '최대' : `🪙 ${cost.gold} · 🌾 ${cost.grain}`}</button></article>`;
    }).join('')}</div></section><div id="toast" class="toast"></div></main>`;
}

function openStory(key, after) {
  ui.screen = 'story'; ui.storyKey = key; ui.storyIndex = 0; ui.afterStory = after; render();
}

function renderStory() {
  const lines = STORY[ui.storyKey] || STORY.prologue;
  const line = lines[Math.min(ui.storyIndex, lines.length - 1)];
  const hero = HEROES[line.speaker];
  const nextLabel = ui.storyIndex >= lines.length - 1 ? '다음 장면' : '계속';
  return `<main class="story-screen">${topUtility()}<div class="story-background"><div class="story-mountain back"></div><div class="story-mountain front"></div><div class="story-road"></div><div class="story-flags"><i>曹</i><i>劉</i></div></div><section class="story-stage"><div class="story-character ${line.speaker === 'narrator' ? 'narrator' : ''}">${hero ? heroPortrait(line.speaker,'story') : `<div class="narrator-seal">記</div>`}</div><div class="story-panel"><div class="story-progress"><span>${ui.storyKey?.toUpperCase()}</span><i style="width:${((ui.storyIndex + 1) / lines.length) * 100}%"></i><b>${ui.storyIndex + 1}/${lines.length}</b></div><small>${escapeHtml(line.name)}</small><p>${escapeHtml(line.text)}</p><button data-action="story-next" type="button">${nextLabel} <b>→</b></button></div></section><div id="toast" class="toast"></div></main>`;
}

function storyNext() {
  const lines = STORY[ui.storyKey] || [];
  playSound('tap');
  if (ui.storyIndex < lines.length - 1) { ui.storyIndex += 1; render(); return; }
  const destination = ui.afterStory || 'hub';
  ui.storyKey = null; ui.storyIndex = 0; ui.afterStory = null;
  ui.screen = destination;
  if (destination === 'hub') saveGame();
  render();
}

function rosterCard(heroId) {
  const hero = HEROES[heroId]; const selected = ui.selectedParty.includes(heroId); const classInfo = CLASSES[hero.classId];
  return `<button class="roster-card ${selected ? 'selected' : ''}" data-action="toggle-hero" data-hero="${heroId}" type="button"><span class="select-number">${selected ? ui.selectedParty.indexOf(heroId) + 1 : '+'}</span><div class="roster-art">${heroPortrait(heroId,'card')}</div><div class="roster-copy"><small>${classInfo.icon} ${classInfo.name} · ${hero.title}</small><h3>${hero.name}</h3><p>${hero.passive?.name || '정예 장수'} · ${hero.passive?.description || ''}</p><div class="mini-stats"><i>HP ${hero.maxHp}</i><i>공 ${hero.attack}</i><i>방 ${hero.defense}</i><i>속 ${hero.speed}</i></div><span class="skill-chip">${hero.skill?.name || '기본 공격'}</span></div></button>`;
}

function renderRoster() {
  const ready = ui.selectedParty.length === 4;
  return `<main class="roster-screen">${topUtility()}<header class="page-hero"><div><span>WAR COUNCIL</span><h1>출전 장수 4명을 선택하라</h1><p>전방의 생존력, 원거리 책략, 회복을 균형 있게 편성하십시오.</p></div><div class="party-summary"><small>선택 인원</small><b>${ui.selectedParty.length}/4</b></div></header><section class="selected-lineup">${[0,1,2,3].map((index) => {
    const id = ui.selectedParty[index]; return `<div class="lineup-slot ${id ? 'filled' : ''}"><span>${index + 1}</span>${id ? heroPortrait(id,'tiny') : '<i>+</i>'}<b>${id ? HEROES[id].name : '빈 자리'}</b>${id ? `<button data-action="move-party-left" data-index="${index}" type="button">←</button><button data-action="move-party-right" data-index="${index}" type="button">→</button>` : ''}</div>`;
  }).join('')}</section><section class="roster-grid">${PLAYER_ROSTER.map(rosterCard).join('')}</section><section class="strategy-section"><div class="section-heading"><span>ENTRY PLAN</span><h2>진입 전략</h2></div><div class="strategy-grid">${Object.values(STRATEGIES).map((strategy) => `<button data-action="select-strategy" data-strategy="${strategy.id}" class="${ui.selectedStrategy === strategy.id ? 'selected' : ''}" type="button"><span>${strategy.icon}</span><div><h3>${strategy.name}</h3><p>${strategy.description}</p></div><i>${ui.selectedStrategy === strategy.id ? '선택됨' : '선택'}</i></button>`).join('')}</div></section><div class="sticky-command"><div><small>편성 전력</small><b>${ui.selectedParty.reduce((sum, id) => sum + HEROES[id].attack + HEROES[id].defense, 0)}</b><span>${ready ? '출전 준비 완료' : '장수 4명을 선택하십시오'}</span></div><button data-action="confirm-roster" class="primary" ${ready ? '' : 'disabled'} type="button">전장 배치로 <b>→</b></button></div><div id="toast" class="toast"></div></main>`;
}

function toggleHero(heroId) {
  if (ui.selectedParty.includes(heroId)) ui.selectedParty = ui.selectedParty.filter((id) => id !== heroId);
  else if (ui.selectedParty.length < 4) ui.selectedParty.push(heroId);
  else { toast('출전 장수는 4명까지 선택할 수 있습니다.', 'bad'); return; }
  playSound('tap'); render();
}

function moveParty(index, delta) {
  const next = index + delta;
  if (next < 0 || next >= ui.selectedParty.length) return;
  [ui.selectedParty[index], ui.selectedParty[next]] = [ui.selectedParty[next], ui.selectedParty[index]];
  playSound('move'); render();
}

function renderDeployment() {
  return `<main class="deployment-screen">${topUtility()}<header class="page-hero compact"><div><span>DEPLOYMENT</span><h1>진류 남서쪽 진입로</h1><p>편성 순서에 따라 좌선봉·중선봉·좌후군·우후군에 배치됩니다.</p></div><div class="strategy-badge"><span>${STRATEGIES[ui.selectedStrategy].icon}</span><b>${STRATEGIES[ui.selectedStrategy].name}</b></div></header><section class="deployment-layout"><div class="deployment-map">${renderMapPreview()}<div class="deployment-legend"><span><i class="player"></i>아군</span><span><i class="enemy"></i>유비군</span><span><i class="objective"></i>지휘소</span></div></div><aside class="deployment-panel"><div class="panel-title"><span>FORMATION</span><h2>출전 순서</h2></div>${ui.selectedParty.map((id, index) => `<article><span>${index + 1}</span>${heroPortrait(id,'tiny')}<div><small>${['좌선봉','중선봉','좌후군','우후군'][index]}</small><b>${HEROES[id].name}</b><p>${HEROES[id].skill?.name}</p></div><button data-action="move-party-left" data-index="${index}" type="button">↑</button><button data-action="move-party-right" data-index="${index}" type="button">↓</button></article>`).join('')}<div class="deployment-tip"><b>곽가의 조언</b><p>기병은 길과 다리를 빠르게 통과합니다. 책사는 후군에서 숲을 이용하십시오.</p></div><button data-action="start-battle" class="primary full" type="button">전투 시작 <b>⚔</b></button></aside></section><div id="toast" class="toast"></div></main>`;
}

function renderMapPreview() {
  return `<div class="preview-grid" style="--cols:${MAP[0].length};--rows:${MAP.length}">${MAP.flatMap((row, y) => row.map((terrainId, x) => `<span class="terrain ${terrainId}" style="--x:${x};--y:${y}"><i>${TERRAIN[terrainId].icon}</i></span>`)).join('')}${ui.selectedParty.map((id, index) => `<div class="preview-unit player" style="--x:${[0,1,0,2][index]};--y:${[6,7,7,7][index]}">${heroPortrait(id,'micro')}<b>${HEROES[id].name}</b></div>`).join('')}${['liu','guan','zhang','zhao'].map((id,index) => `<div class="preview-unit enemy" style="--x:${[11,9,9,10][index]};--y:${[3,1,5,6][index]}">${heroPortrait(id,'micro')}<b>${HEROES[id].name}</b></div>`).join('')}</div>`;
}

function beginBattle() {
  game.party = [...ui.selectedParty]; game.strategy = ui.selectedStrategy;
  game.battle = createBattle({ party: game.party, strategy: game.strategy, facilities: game.facilities, difficulty: game.settings.difficulty, seed: 190001 + game.records.victories * 17 });
  ui.screen = 'battle'; ui.selectedUnitId = null; ui.mode = 'move'; ui.busy = false; ui.battleIntro = true; ui.battleIntroIndex = 0; ui.reportApplied = false;
  saveGame(); playSound('turn'); render();
}

function renderBattle() {
  const state = game.battle;
  if (!state) { ui.screen = 'roster'; return renderRoster(); }
  if (state.result && !ui.reportApplied) applyBattleResult();
  const selected = ui.selectedUnitId ? getUnit(state, ui.selectedUnitId) : null;
  const reachable = selected && ui.mode === 'move' ? getReachableCells(state, selected.id) : [];
  const attackTargets = selected && ui.mode === 'attack' ? getBasicAttackTargets(state, selected.id) : [];
  const skillTargets = selected && ui.mode === 'skill' ? getSkillTargets(state, selected.id) : [];
  const reachableKeys = new Set(reachable.map((cell) => `${cell.x},${cell.y}`));
  const attackKeys = new Set(attackTargets.map((unit) => `${unit.x},${unit.y}`));
  const skillKeys = new Set(skillTargets.map((unit) => `${unit.x},${unit.y}`));
  const summary = battleSummary(state);
  return `<main class="battle-screen ${ui.busy ? 'busy' : ''}"><header class="battle-hud"><button data-action="battle-menu" class="hud-brand" type="button"><span>天</span><div><small>${CHAPTER.number}장</small><b>${CHAPTER.title}</b></div></button><div class="turn-indicator"><small>${state.phase === 'player' ? 'PLAYER PHASE' : state.phase === 'enemy' ? 'ENEMY PHASE' : 'BATTLE END'}</small><b>${state.turn}<i>/${state.turnLimit}</i></b></div><div class="battle-count"><span class="blue"><i></i><b>${summary.playerAlive}</b> 아군</span><span class="red"><i></i><b>${summary.enemyAlive}</b> 적군</span></div><div class="hud-actions"><button data-action="toggle-zoom" type="button">${game.settings.zoom === 'normal' ? '축소' : '확대'}</button><button data-action="toggle-sound" type="button">${isSoundEnabled() ? '🔊' : '🔇'}</button></div></header>
    <section class="objective-bar"><div><span>MAIN OBJECTIVE</span><b>${CHAPTER.objective}</b></div><div class="objective-progress"><i class="${getLivingUnits(state,'enemy').some((unit) => unit.heroId === 'liu') ? '' : 'done'}">유비 격파</i><em>또는</em><i class="${state.flags.commandCaptured ? 'done' : ''}">지휘소 점령</i></div><button data-action="show-help" type="button">전투 도움말</button></section>
    <section class="battle-layout"><aside class="turn-order-panel"><div class="panel-title"><span>TURN ORDER</span><h2>행동 현황</h2></div><div class="turn-list">${[...getLivingUnits(state)].sort((a,b) => b.speed-a.speed).map((unit) => `<button data-action="inspect-unit" data-unit="${unit.id}" class="${unit.acted ? 'acted' : ''} ${ui.selectedUnitId===unit.id?'selected':''}" type="button">${heroPortrait(unit.heroId,'nano')}<div><b>${HEROES[unit.heroId].name}</b><span>${unit.team==='player'?'아군':'적군'} · ${unit.acted?'행동 완료':'대기'}</span></div><i>${unit.hp}</i></button>`).join('')}</div><div class="battle-log-mini">${state.log.slice(0,6).map((entry) => `<p data-tone="${entry.tone}"><span>${entry.turn}</span>${escapeHtml(entry.text)}</p>`).join('')}</div></aside>
      <div class="battlefield-shell"><div class="battlefield-scroll"><div class="battle-grid ${game.settings.zoom}" style="--cols:${state.width};--rows:${state.height}">${state.terrain.flatMap((row,y) => row.map((terrainId,x) => {
        const unit = getUnitAt(state,x,y); const classes = ['battle-cell',`terrain-${terrainId}`];
        if (reachableKeys.has(`${x},${y}`)) classes.push('reachable');
        if (attackKeys.has(`${x},${y}`)) classes.push('attackable');
        if (skillKeys.has(`${x},${y}`)) classes.push('skill-target');
        if (x===state.objective.x && y===state.objective.y) classes.push('objective-cell');
        return `<button class="${classes.join(' ')}" data-action="battle-cell" data-x="${x}" data-y="${y}" type="button"><span>${TERRAIN[terrainId].icon}</span>${x===state.objective.x&&y===state.objective.y?'<b>本陣</b>':''}${unit?`<i class="occupied ${unit.team}"></i>`:''}</button>`;
      })).join('')}<div class="unit-layer">${getLivingUnits(state).map((unit) => renderBattleUnit(unit, selected?.id===unit.id, attackKeys.has(`${unit.x},${unit.y}`)||skillKeys.has(`${unit.x},${unit.y}`))).join('')}</div></div></div><div class="terrain-readout"><span>선택 지형</span><b id="terrain-name">칸을 눌러 확인</b><small>숲·언덕은 방어가 오르고 이동 비용이 증가합니다.</small></div></div>
      <aside class="unit-command-panel">${renderUnitPanel(selected,state)}</aside></section>
    <footer class="battle-footer"><div><small>${state.phase==='player'?'아군 행동':'적군이 움직이는 중'}</small><b>${state.phase==='player' ? (allUnitsActed(state)?'모든 장수가 행동했습니다.':'장수를 선택해 이동·공격하십시오.') : '화면을 가리지 않고 순서대로 진행합니다.'}</b></div><button data-action="end-turn" class="primary" ${state.phase!=='player'||ui.busy||state.result?'disabled':''} type="button">턴 종료 <b>→</b></button></footer>
    ${ui.battleIntro ? renderBattleDialogue() : ''}${state.result ? renderBattleEndOverlay() : ''}<div id="effect-layer" class="effect-layer"></div><div id="toast" class="toast"></div></main>`;
}

function renderBattleUnit(unit, selected, targetable) {
  const hero = HEROES[unit.heroId]; const hpPct = Math.max(0, unit.hp / unit.maxHp * 100);
  const statuses = [];
  if (unit.status.shield>0) statuses.push('🛡'); if (unit.status.stun>0) statuses.push('💫'); if (unit.status.root>0) statuses.push('⛓');
  return `<button class="battle-unit ${unit.team} ${selected?'selected':''} ${unit.acted?'acted':''} ${targetable?'targetable':''}" data-action="select-battle-unit" data-unit="${unit.id}" style="--x:${unit.x};--y:${unit.y}" type="button"><div class="unit-shadow"></div>${heroPortrait(unit.heroId,'unit')}<div class="unit-banner"><span>${hero.emblem}</span></div><div class="unit-hp"><i style="width:${hpPct}%"></i></div><div class="unit-label"><b>${hero.name}</b><span>${unit.hp}/${unit.maxHp}</span></div>${statuses.length?`<div class="unit-status">${statuses.join('')}</div>`:''}${unit.leader?'<em>主</em>':''}</button>`;
}

function renderUnitPanel(unit,state) {
  if (!unit) return `<div class="empty-command"><span>將</span><h3>장수를 선택하십시오</h3><p>아군 장수를 누르면 이동 범위와 명령이 표시됩니다. 적 장수를 누르면 능력치를 확인합니다.</p><ul><li><i class="move"></i>푸른 칸: 이동</li><li><i class="attack"></i>붉은 칸: 공격</li><li><i class="skill"></i>금색 칸: 기술</li></ul></div>`;
  const hero = HEROES[unit.heroId]; const classInfo = CLASSES[hero.classId]; const ally = unit.team==='player';
  return `<div class="unit-profile"><div class="profile-head">${heroPortrait(unit.heroId,'panel')}<div><small>${classInfo.icon} ${classInfo.name} · ${hero.title}</small><h2>${hero.name}</h2><span>${hero.hanja}</span></div></div><div class="profile-hp"><div><span>병력</span><b>${unit.hp}/${unit.maxHp}</b></div><i><b style="width:${unit.hp/unit.maxHp*100}%"></b></i></div><div class="profile-stats">${statBar('공격',unit.attack)}${statBar('방어',unit.defense)}${statBar('책략',unit.magic)}${statBar('속도',unit.speed,25)}</div><div class="passive-box"><small>고유 특성</small><b>${hero.passive?.name||'정예병'}</b><p>${hero.passive?.description||'기본 전투 규칙을 따릅니다.'}</p></div>${hero.skill?`<div class="skill-box"><span>${unit.skill}/${unit.skillMax}</span><div><small>고유 기술</small><b>${hero.skill.name}</b><p>${hero.skill.description}</p></div></div>`:''}${ally&&!unit.acted&&state.phase==='player'?`<div class="command-grid"><button data-action="command-move" class="${ui.mode==='move'?'active':''}" type="button"><span>➜</span><b>이동</b></button><button data-action="command-attack" class="${ui.mode==='attack'?'active':''}" type="button"><span>⚔</span><b>공격</b></button><button data-action="command-skill" class="${ui.mode==='skill'?'active':''}" ${!hero.skill||unit.skill<=0?'disabled':''} type="button"><span>✦</span><b>기술</b></button><button data-action="command-wait" type="button"><span>⏳</span><b>대기</b></button>${state.movedFrom?.unitId===unit.id?'<button data-action="undo-move" class="undo" type="button"><span>↶</span><b>이동 취소</b></button>':''}</div>`:`<div class="acted-note">${unit.dead?'전장 이탈':unit.acted?'이번 턴 행동 완료':unit.team==='enemy'?'적군 정보':'행동 대기'}</div>`}<blockquote>“${escapeHtml(hero.quote)}”</blockquote></div>`;
}

function renderBattleDialogue() {
  const line = STORY.boss[ui.battleIntroIndex]; const hero = HEROES[line.speaker];
  return `<div class="battle-dialogue"><div class="dialogue-scene"><div class="dialogue-character ${line.speaker==='cao'?'left':'right'}">${heroPortrait(line.speaker,'story')}</div><div class="dialogue-box"><small>${line.name}</small><p>${line.text}</p><button data-action="battle-dialogue-next" type="button">${ui.battleIntroIndex===STORY.boss.length-1?'전투 개시':'계속'} <b>→</b></button></div></div></div>`;
}

function battleDialogueNext() {
  playSound('tap');
  if (ui.battleIntroIndex < STORY.boss.length-1) { ui.battleIntroIndex += 1; render(); }
  else { ui.battleIntro=false; render(); }
}

function renderBattleEndOverlay() {
  const victory = game.battle.result.outcome==='victory'; const summary=battleSummary(game.battle);
  return `<div class="battle-end-overlay"><section class="battle-end-card ${victory?'victory':'defeat'}"><div class="result-seal">${victory?'勝':'退'}</div><span>${victory?'BATTLE VICTORY':'TACTICAL RETREAT'}</span><h2>${victory?'진류의 깃발을 확보했습니다':'대열을 수습해 퇴각합니다'}</h2><p>${victory?'장수들의 공적과 시설 보너스에 따라 전후 보상이 지급됩니다.':'편성과 지형을 바꾸어 같은 장을 다시 도전할 수 있습니다.'}</p><div class="result-quick"><i><small>소요 턴</small><b>${summary.turn}</b></i><i><small>생존 장수</small><b>${summary.playerAlive}</b></i><i><small>남은 적군</small><b>${summary.enemyAlive}</b></i></div><button data-action="open-result" class="primary full" type="button">전투 결과 확인 <b>→</b></button></section></div>`;
}

function applyBattleResult() {
  if (!game.battle?.result || game.battle.rewardApplied) { ui.reportApplied = true; return; }
  ui.reportApplied=true;
  game.battle.rewardApplied = true;
  const victory=game.battle.result.outcome==='victory';
  if (victory) {
    const marketBonus=1+(game.facilities.market-1)*0.12;
    const turnBonus=Math.max(0,CHAPTER.turnLimit-game.battle.turn)*12;
    game.lastRewards={ gold:Math.round((CHAPTER.rewards.gold+turnBonus)*marketBonus), grain:CHAPTER.rewards.grain, fame:CHAPTER.rewards.fame };
    game.resources.gold+=game.lastRewards.gold; game.resources.grain+=game.lastRewards.grain; game.resources.fame+=game.lastRewards.fame;
    game.chapterCleared=true; game.records.victories+=1;
    game.records.bestTurns=game.records.bestTurns?Math.min(game.records.bestTurns,game.battle.turn):game.battle.turn;
    playSound('victory');
  } else { game.lastRewards={gold:40,grain:0,fame:0}; game.resources.gold+=40; game.records.defeats+=1; playSound('defeat'); }
  saveGame();
}

function renderResult() {
  const battle=game.battle; if(!battle){ui.screen='hub';return renderHub();}
  const victory=battle.result?.outcome==='victory'; const summary=battleSummary(battle); const rewards=game.lastRewards||{gold:0,grain:0,fame:0};
  const best=getLivingUnits(battle,'player').sort((a,b)=>b.hp/b.maxHp-a.hp/a.maxHp)[0]||battle.units.find(u=>u.team==='player');
  return `<main class="result-screen">${topUtility()}<section class="result-hero ${victory?'victory':'defeat'}"><div><span>${victory?'CHAPTER CLEAR':'BATTLE REPORT'}</span><h1>${victory?'진류의 첫 깃발':'전열 재정비'}</h1><p>${victory?'진류의 백성과 창고가 새로운 결정을 기다립니다.':'패배 원인을 확인하고 출전 장수와 전략을 바꾸십시오.'}</p></div>${best?heroPortrait(best.heroId,'story'):''}<div class="result-stamp">${victory?'勝利':'退却'}</div></section><section class="result-grid"><article class="reward-card"><div class="panel-title"><span>REWARDS</span><h2>전후 보상</h2></div><div class="reward-list"><span>🪙<small>금</small><b>+${rewards.gold}</b></span><span>🌾<small>군량</small><b>+${rewards.grain}</b></span><span>🏮<small>명성</small><b>+${rewards.fame}</b></span></div><p>${victory?`시장 Lv.${game.facilities.market} 보너스와 ${Math.max(0,CHAPTER.turnLimit-battle.turn)}턴 여유 보상이 반영됐습니다.`:'퇴각 지원금만 지급됐습니다.'}</p></article><article class="record-card"><div class="panel-title"><span>RECORD</span><h2>전투 기록</h2></div><dl><div><dt>소요 턴</dt><dd>${summary.turn}/${battle.turnLimit}</dd></div><div><dt>생존 장수</dt><dd>${summary.playerAlive}/4</dd></div><div><dt>승리 방식</dt><dd>${battle.result.reason==='leader-defeated'?'유비 격파':battle.result.reason==='command-captured'?'지휘소 점령':'퇴각'}</dd></div><div><dt>최고 기록</dt><dd>${game.records.bestTurns??'-'}턴</dd></div></dl></article><article class="log-card"><div class="panel-title"><span>BATTLE LOG</span><h2>결정적 순간</h2></div>${battle.log.filter(entry=>['critical','skill','good','bad','guard'].includes(entry.tone)).slice(0,7).map(entry=>`<p data-tone="${entry.tone}"><span>${entry.turn}턴</span>${escapeHtml(entry.text)}</p>`).join('')||'<p>전투 기록이 없습니다.</p>'}</article></section><div class="result-actions">${victory?`<button data-action="post-victory-story" class="primary" type="button">전후 회의로 <b>→</b></button>`:`<button data-action="retry-battle" class="primary" type="button">편성을 바꿔 재도전 <b>→</b></button>`}<button data-action="return-hub" class="secondary" type="button">허창으로 돌아가기</button></div><div id="toast" class="toast"></div></main>`;
}

function bindDynamicInputs() {
  const difficulty=document.querySelector('[data-setting="difficulty"]'); if(difficulty) difficulty.value=game.settings.difficulty;
}

function selectBattleUnit(unitId) {
  if(ui.busy||ui.battleIntro||game.battle.result)return;
  const clicked=getUnit(game.battle,unitId); if(!clicked)return;
  const selected=ui.selectedUnitId?getUnit(game.battle,ui.selectedUnitId):null;
  if(selected&&selected.team==='player'&&!selected.acted&&game.battle.phase==='player'){
    if(ui.mode==='attack'&&clicked.team==='enemy'){
      executePlayerAction(basicAttack(game.battle,selected.id,clicked.id),'attack',clicked);
      return;
    }
    if(ui.mode==='skill'&&getSkillTargets(game.battle,selected.id).some((target)=>target.id===clicked.id)){
      executePlayerAction(useSkill(game.battle,selected.id,clicked.id),'skill',clicked);
      return;
    }
  }
  ui.selectedUnitId=unitId; game.battle=selectUnit(game.battle,unitId); ui.mode=clicked.team==='player'&&!clicked.acted?'move':'inspect'; playSound('tap'); render();
}

function battleCellClick(x,y) {
  if(ui.busy||ui.battleIntro||game.battle.result||game.battle.phase!=='player')return;
  const state=game.battle; const selected=ui.selectedUnitId?getUnit(state,ui.selectedUnitId):null; const occupied=getUnitAt(state,x,y);
  document.querySelector('#terrain-name')?.replaceChildren(document.createTextNode(TERRAIN[state.terrain[y][x]].name));
  if(!selected){ if(occupied)selectBattleUnit(occupied.id); return; }
  if(occupied&&occupied.id!==selected.id){
    if(ui.mode==='attack'&&occupied.team!==selected.team){ executePlayerAction(basicAttack(state,selected.id,occupied.id),'attack',occupied); return; }
    if(ui.mode==='skill'){ executePlayerAction(useSkill(state,selected.id,occupied.id),'skill',occupied); return; }
    selectBattleUnit(occupied.id); return;
  }
  if(ui.mode==='move'){
    const result=moveUnit(state,selected.id,x,y); if(!result.ok){toast(result.message,'bad');return;} game.battle=result.state; ui.mode='action'; playSound('move'); animateEvent(result.event); saveGame(); render(); return;
  }
  if(ui.mode==='skill'){
    const hero=HEROES[selected.heroId]; if(['self','support','area'].includes(hero.skill?.type)){executePlayerAction(useSkill(state,selected.id,selected.id),'skill',selected);}
  }
}

function executePlayerAction(result,sound,target) {
  if(!result.ok){toast(result.message,'bad');return;}
  game.battle=result.state; ui.selectedUnitId=null; ui.mode='move'; playSound(sound==='skill'?(result.event?.events?.some(e=>e.type==='heal')?'heal':'skill'):(result.event?.critical?'critical':'attack')); saveGame(); render(); animateEvent(result.event,target?.id);
}

function animateEvent(event,targetId='') {
  window.setTimeout(()=>{
    const layer=document.querySelector('#effect-layer'); if(!layer||!event)return;
    const target=event.targetId||targetId; const targetElement=target?document.querySelector(`[data-unit="${target}"], [data-unit-id="${target}"]`):null;
    if(targetElement){targetElement.classList.add('hit-flash');window.setTimeout(()=>targetElement.classList.remove('hit-flash'),450);}
    if(event.damage){const floater=document.createElement('b');floater.className='damage-float';floater.textContent=`-${event.damage}`;if(targetElement){const r=targetElement.getBoundingClientRect();floater.style.left=`${r.left+r.width/2}px`;floater.style.top=`${r.top}px`;}layer.appendChild(floater);window.setTimeout(()=>floater.remove(),850);}
  },20);
}

async function endTurn() {
  if(ui.busy||game.battle.phase!=='player'||game.battle.result)return;
  ui.busy=true; ui.selectedUnitId=null; game.battle=startEnemyPhase(game.battle); playSound('turn'); render(); await delay(450);
  while(!game.battle.result){const enemy=nextEnemyUnit(game.battle);if(!enemy)break;const plan=planEnemyAction(game.battle,enemy.id);const result=executeEnemyAction(game.battle,plan);if(result.ok){game.battle=result.state;render();const event=Array.isArray(result.events)?result.events.at(-1):result.event;playSound(event?.type==='skill'?'skill':event?.type==='attack'?(event.critical?'critical':'attack'):'move');animateEvent(event);await delay(520);}else break;}
  if(!game.battle.result)game.battle=finishEnemyPhase(game.battle);ui.busy=false;saveGame();render();
}

const delay=(ms)=>new Promise(resolve=>window.setTimeout(resolve,ms));

function upgradeFacility(id) {
  const level=game.facilities[id]; if(level>=4)return; const cost=facilityCost(id);
  if(game.resources.gold<cost.gold||game.resources.grain<cost.grain){toast('금 또는 군량이 부족합니다.','bad');return;}
  game.resources.gold-=cost.gold;game.resources.grain-=cost.grain;game.facilities[id]+=1;playSound('recruit');saveGame();render();toast(`${FACILITIES[id].name}이(가) Lv.${level+1}로 성장했습니다.`,'good');
}

function handleAction(action,element) {
  if(action==='new-game')startNewGame();
  else if(action==='continue-game')continueGame();
  else if(action==='home'){ui.screen=game.chapterCleared?'hub':'title';saveGame();render();}
  else if(action==='toggle-sound'){toggleSound();render();}
  else if(action==='reset-save'){if(confirm('모든 천하일지 저장 기록을 초기화할까요?'))resetGame();}
  else if(action==='story-next')storyNext();
  else if(action==='open-roster'){ui.selectedParty=[...game.party];ui.selectedStrategy=game.strategy;ui.screen='roster';render();}
  else if(action==='toggle-hero')toggleHero(element.dataset.hero);
  else if(action==='move-party-left')moveParty(Number(element.dataset.index),-1);
  else if(action==='move-party-right')moveParty(Number(element.dataset.index),1);
  else if(action==='select-strategy'){ui.selectedStrategy=element.dataset.strategy;playSound('tap');render();}
  else if(action==='confirm-roster'){if(ui.selectedParty.length===4)openStory('deployment','deployment');}
  else if(action==='start-battle')beginBattle();
  else if(action==='battle-dialogue-next')battleDialogueNext();
  else if(action==='select-battle-unit'||action==='inspect-unit')selectBattleUnit(element.dataset.unit);
  else if(action==='battle-cell')battleCellClick(Number(element.dataset.x),Number(element.dataset.y));
  else if(action==='command-move'){ui.mode='move';render();}
  else if(action==='command-attack'){ui.mode='attack';render();}
  else if(action==='command-skill'){
    const unit=getUnit(game.battle,ui.selectedUnitId);const hero=unit?HEROES[unit.heroId]:null;
    if(hero?.skill&&['self','support','area'].includes(hero.skill.type))executePlayerAction(useSkill(game.battle,unit.id,unit.id),'skill',unit);
    else{ui.mode='skill';render();}
  }
  else if(action==='command-wait'){executePlayerAction(waitUnit(game.battle,ui.selectedUnitId),'tap');}
  else if(action==='undo-move'){const result=undoMove(game.battle,ui.selectedUnitId);if(result.ok){game.battle=result.state;ui.mode='move';render();}}
  else if(action==='end-turn')endTurn();
  else if(action==='toggle-zoom'){game.settings.zoom=game.settings.zoom==='normal'?'overview':'normal';saveGame();render();}
  else if(action==='open-result'){ui.screen='result';render();}
  else if(action==='post-victory-story'){openStory('victory','hub');game.battle=null;saveGame();}
  else if(action==='retry-battle'){game.battle=null;ui.screen='roster';ui.reportApplied=false;render();}
  else if(action==='return-hub'){game.battle=null;ui.screen='hub';saveGame();render();}
  else if(action==='upgrade-facility')upgradeFacility(element.dataset.facility);
  else if(action==='battle-menu'){if(confirm('전투를 저장하고 허창으로 돌아갈까요?')){ui.screen='hub';saveGame();render();}}
  else if(action==='show-help')toast('장수 선택 → 푸른 칸 이동 → 공격/기술 → 붉은·금색 대상 선택 순서입니다.','good');
}

app?.addEventListener('click',(event)=>{const target=event.target instanceof Element?event.target.closest('[data-action]'):null;if(!target)return;handleAction(target.dataset.action,target);});
window.addEventListener('keydown',(event)=>{if(ui.screen==='battle'&&event.key==='Enter'&&game.battle?.phase==='player'&&!ui.busy)endTurn();if(event.key==='Escape'&&ui.screen==='battle'){ui.selectedUnitId=null;game.battle=clearSelection(game.battle);ui.mode='move';render();}});

render();
