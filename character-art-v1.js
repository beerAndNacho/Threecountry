const ART_VERSION = '20260818-6';
const HERO_ORDER = ['cao', 'xiahou', 'dian', 'xun', 'guo'];
const STATE_ORDER = ['idle', 'move', 'attack', 'skill'];

const ART = {
  cao: { name: '조조', role: '군주 · 기병', tone: '#6d48a8' },
  xiahou: { name: '하후돈', role: '선봉 · 보병', tone: '#355f91' },
  dian: { name: '전위', role: '수호 · 호위', tone: '#b07835' },
  xun: { name: '순욱', role: '내정 · 책사', tone: '#467aa4' },
  guo: { name: '곽가', role: '기책 · 책사', tone: '#8152b5' },
};

const NAME_TO_ID = Object.fromEntries(Object.entries(ART).map(([id, art]) => [art.name, id]));
const PACKS = {
  portrait: { prefix: 'portraits-v1-sm', parts: 1 },
  sprite: { prefix: 'sprites-v1-sm', parts: 5 },
};
const ATLAS = { portrait: '', sprite: '' };
let atlasesReady = false;

let scheduled = false;
let modalOpen = false;

function rowPosition(id) {
  const index = HERO_ORDER.indexOf(id);
  return index <= 0 ? 0 : (index / (HERO_ORDER.length - 1)) * 100;
}

function statePosition(state) {
  const index = STATE_ORDER.indexOf(state);
  return index <= 0 ? 0 : (index / (STATE_ORDER.length - 1)) * 100;
}

function applyAtlasVars(element, id, state = 'portrait') {
  element.style.setProperty('--hero-row', `${rowPosition(id)}%`);
  element.style.setProperty('--state-col', `${statePosition(state)}%`);
  element.style.setProperty('--premium-tone', ART[id]?.tone || '#b49352');
  element.dataset.heroArt = id;
  element.dataset.artState = state;
}

function heroIdFromSvg(svg) {
  const label = svg.getAttribute('aria-label')?.trim() || '';
  return NAME_TO_ID[label] || '';
}

function visualStateFor(svg) {
  const className = svg.getAttribute('class') || '';
  return /\bunit\b|\bmicro\b/.test(className) ? 'idle' : 'portrait';
}

function replacePortraits(root = document) {
  if (!atlasesReady) return;
  root.querySelectorAll('svg.hero-portrait:not([data-premium-scan])').forEach((svg) => {
    svg.setAttribute('data-premium-scan', '1');
    const id = heroIdFromSvg(svg);
    if (!id) return;
    const state = visualStateFor(svg);
    const art = document.createElement('span');
    art.className = `${svg.getAttribute('class') || 'hero-portrait'} hero-art-v1`;
    art.setAttribute('role', 'img');
    art.setAttribute('aria-label', `${ART[id].name} ${state === 'idle' ? '전장 유닛' : '캐릭터 일러스트'}`);
    if (svg.getAttribute('style')) art.setAttribute('style', svg.getAttribute('style'));
    applyAtlasVars(art, id, state);
    const unit = svg.closest('.battle-unit');
    if (unit) unit.dataset.heroArt = id;
    svg.replaceWith(art);
  });
}

function enhanceRoster(root = document) {
  root.querySelectorAll('.roster-card[data-hero]:not([data-premium-art])').forEach((card) => {
    const id = card.dataset.hero;
    if (!ART[id]) return;
    card.dataset.premiumArt = '1';
    card.style.setProperty('--premium-tone', ART[id].tone);
    const art = card.querySelector('.roster-art');
    art?.insertAdjacentHTML('beforeend', `<span class="premium-art-badge" data-art-detail="${id}"><i>✦</i> 고해상도 상세</span>`);
  });
}

function enhanceStory(root = document) {
  root.querySelectorAll('.story-character:not([data-premium-story])').forEach((stage) => {
    if (!stage.querySelector('.hero-art-v1')) return;
    stage.dataset.premiumStory = '1';
    stage.insertAdjacentHTML('beforeend', '<span class="story-art-credit">PREMIUM CHARACTER ART</span>');
  });
}

function enhanceBattleUnits(root = document) {
  root.querySelectorAll('.battle-unit[data-hero-art]:not([data-premium-unit])').forEach((unit) => {
    unit.dataset.premiumUnit = '1';
    const id = unit.dataset.heroArt;
    unit.style.setProperty('--premium-tone', ART[id]?.tone || '#b49352');
    unit.insertAdjacentHTML('beforeend', '<span class="premium-unit-ring"></span>');
  });
}

function openCharacterSheet(id) {
  if (!ART[id] || modalOpen || !atlasesReady) return;
  modalOpen = true;
  const modal = document.createElement('div');
  modal.className = 'character-sheet-modal';
  modal.innerHTML = `<div class="character-sheet-backdrop" data-sheet-close></div>
    <section style="--premium-tone:${ART[id].tone}">
      <header><div><small>PREMIUM OFFICER FILE</small><b>${ART[id].name}</b><span>${ART[id].role}</span></div><button type="button" data-sheet-close aria-label="닫기">×</button></header>
      <div class="character-sheet-scroll"><div class="character-detail-layout"><div class="character-sheet-art" role="img" aria-label="${ART[id].name} 캐릭터 일러스트"></div><aside><small>GAME-READY VISUAL SET</small><h2>${ART[id].name}</h2><p>${ART[id].role}</p><div class="character-state-grid">${STATE_ORDER.map((state) => `<article><span class="character-state-art" data-state="${state}"></span><b>${({ idle: '대기', move: '이동', attack: '공격', skill: '기술' })[state]}</b></article>`).join('')}</div><blockquote>초상과 전장 SD 유닛을 분리 적용해 편성·스토리·전투 화면에서 동일한 캐릭터 정체성을 유지합니다.</blockquote></aside></div></div>
      <footer><span>현재 조조·하후돈·전위·순욱·곽가 5명의 프리미엄 비주얼이 적용되었습니다.</span><button type="button" data-sheet-close>게임으로 돌아가기</button></footer>
    </section>`;
  applyAtlasVars(modal.querySelector('.character-sheet-art'), id, 'portrait');
  modal.querySelectorAll('.character-state-art').forEach((element) => applyAtlasVars(element, id, element.dataset.state));
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
}

function closeCharacterSheet() {
  const modal = document.querySelector('.character-sheet-modal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => {
    modal.remove();
    modalOpen = false;
  }, 260);
}

function rectOf(element) {
  const rect = element?.getBoundingClientRect();
  return rect && rect.width && rect.height ? rect : null;
}

function overlaySprite(id, state, fromRect, toRect = null, duration = 520) {
  if (!ART[id] || !fromRect) return;
  const overlay = document.createElement('span');
  overlay.className = `premium-action-sprite ${state}`;
  applyAtlasVars(overlay, id, state);
  overlay.style.left = `${fromRect.left}px`;
  overlay.style.top = `${fromRect.top}px`;
  overlay.style.width = `${Math.max(54, fromRect.width)}px`;
  overlay.style.height = `${Math.max(54, fromRect.height)}px`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.add('play');
    if (toRect) overlay.style.transform = `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px) scale(${state === 'move' ? 1.03 : 1.12})`;
  });
  setTimeout(() => overlay.classList.add('fade'), Math.max(180, duration - 170));
  setTimeout(() => overlay.remove(), duration + 80);
}

function effectBurst(targetRect, kind = 'attack') {
  if (!targetRect) return;
  const effect = document.createElement('div');
  effect.className = `premium-hit-effect ${kind}`;
  effect.style.left = `${targetRect.left + targetRect.width / 2}px`;
  effect.style.top = `${targetRect.top + targetRect.height / 2}px`;
  effect.innerHTML = '<i></i><b></b><span></span>';
  document.body.appendChild(effect);
  setTimeout(() => effect.remove(), 720);
}

function activeCommand() {
  return document.querySelector('.command-grid button.active[data-action]')?.dataset.action || '';
}

function animateBattleIntent(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const selected = document.querySelector('.battle-unit.player.selected[data-hero-art]');
  if (!selected) return;
  const id = selected.dataset.heroArt;
  if (!ART[id]) return;
  const actorRect = rectOf(selected);
  const command = activeCommand();
  const enemy = target.closest('.battle-unit.enemy');
  if (enemy && (command === 'command-attack' || command === 'command-skill')) {
    const targetRect = rectOf(enemy);
    const state = command === 'command-skill' ? 'skill' : 'attack';
    overlaySprite(id, state, actorRect, targetRect, state === 'skill' ? 760 : 560);
    effectBurst(targetRect, state);
    return;
  }
  const cell = target.closest('.battle-cell');
  if (cell && command === 'command-move') overlaySprite(id, 'move', actorRect, rectOf(cell), 520);
}

function pulseActionButton(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest('[data-action="command-skill"], [data-action="command-attack"]')) return;
  const selected = document.querySelector('.battle-unit.player.selected[data-hero-art]');
  if (!selected) return;
  selected.classList.remove('premium-command-ready');
  requestAnimationFrame(() => selected.classList.add('premium-command-ready'));
}

async function loadAtlasPack(kind) {
  const pack = PACKS[kind];
  const parts = await Promise.all(Array.from({ length: pack.parts }, async (_, index) => {
    const suffix = String(index).padStart(2, '0');
    const response = await fetch(`./assets/character-art-v1/${pack.prefix}.b64.part${suffix}?v=${ART_VERSION}`);
    if (!response.ok) throw new Error(`${pack.prefix} art pack part ${suffix} failed: ${response.status}`);
    return response.text();
  }));
  const binary = atob(parts.join('').trim());
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
}

async function preload() {
  try {
    const [portrait, sprite] = await Promise.all([
      loadAtlasPack('portrait'), loadAtlasPack('sprite'),
    ]);
    ATLAS.portrait = portrait; ATLAS.sprite = sprite;
    document.documentElement.style.setProperty('--portrait-atlas', `url("${portrait}")`);
    document.documentElement.style.setProperty('--sprite-atlas', `url("${sprite}")`);
    atlasesReady = true;
    document.documentElement.classList.add('premium-character-art-ready');
    schedule();
  } catch (error) {
    console.error('[character-art-v1] art pack load failed', error);
    document.documentElement.classList.add('premium-character-art-failed');
  }
}

function enhance() {
  scheduled = false;
  document.documentElement.classList.add('premium-character-art-v1');
  replacePortraits();
  enhanceRoster();
  enhanceStory();
  enhanceBattleUnits();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(enhance);
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const detail = target.closest('[data-art-detail]');
  if (detail) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openCharacterSheet(detail.dataset.artDetail);
    return;
  }
  if (target.closest('[data-sheet-close]')) {
    event.preventDefault();
    closeCharacterSheet();
    return;
  }
  pulseActionButton(event);
}, true);

document.addEventListener('pointerdown', animateBattleIntent, true);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalOpen) closeCharacterSheet();
});

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
preload();
schedule();
