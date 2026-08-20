import { CLASSES, HEROES, PLAYER_ROSTER, TERRAIN } from './content.js';
import { EQUIPMENT, heroGrowthStats, loadCommercialMeta } from './commercial-data.js';
import { HERO_LORE, renderHeroBust } from './commercial-character-v4.js';

export const TACTICAL_INTEL_VERSION = '1.0.0';
const PREF_KEY = 'threecountry:tactical-intel:v1';
const meta = loadCommercialMeta();
const NAME_TO_ID = new Map(Object.entries(HERO_LORE).map(([id, profile]) => [profile.name, id]));
let scheduled = false;
let modal = null;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function loadPrefs() {
  try { return { threat: true, terrain: false, compact: true, density: 'normal', ...(JSON.parse(localStorage.getItem(PREF_KEY) || '{}')) }; }
  catch { return { threat: true, terrain: false, compact: true, density: 'normal' }; }
}
let prefs = loadPrefs();
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} }

function heroIdFrom(element) {
  if (!(element instanceof Element)) return '';
  const direct = element.dataset.hero || element.dataset.commercialHeroId || element.dataset.heroId;
  if (direct) return direct;
  const svg = element.matches('svg') ? element : element.querySelector('svg[data-hero-id],svg[aria-label]');
  const fromSvg = svg?.dataset.heroId || NAME_TO_ID.get(svg?.getAttribute('aria-label') || '');
  if (fromSvg) return fromSvg;
  const name = [...NAME_TO_ID.keys()].find((candidate) => element.textContent?.includes(candidate));
  return name ? NAME_TO_ID.get(name) : '';
}

function equipmentFor(heroId) {
  return Object.entries(meta.loadouts?.[heroId] || {}).map(([slot, itemId]) => ({ slot, item: EQUIPMENT[itemId] })).filter(({ item }) => item);
}

function dossierMarkup(heroId, compact = false) {
  const lore = HERO_LORE[heroId];
  const hero = HEROES[heroId];
  if (!lore || !hero) return '';
  const growth = heroGrowthStats(heroId, meta);
  const classInfo = CLASSES[hero.classId] || { name: hero.classId, icon: '兵' };
  const equipment = equipmentFor(heroId);
  const stats = growth || { hp: hero.maxHp, attack: hero.attack, defense: hero.defense, magic: hero.magic, speed: hero.speed, level: 1 };
  return `<article class="tiv1-dossier ${compact ? 'compact' : ''}" data-dossier="${esc(heroId)}">
    <div class="tiv1-dossier-art">${renderHeroBust(heroId, compact ? 'medium' : 'story')}</div>
    <div class="tiv1-dossier-copy">
      <header><div><small>${classInfo.icon} ${esc(classInfo.name)} · ${esc(hero.title || lore.role || '')}</small><h2>${esc(lore.name)}${lore.courtesy ? `<em>자 ${esc(lore.courtesy)}</em>` : ''}</h2><p>${esc(lore.origin)} · ${lore.age}세 · ${esc(lore.height)} · ${esc(lore.build)}</p></div><span>Lv.${stats.level || 1}</span></header>
      <blockquote><small>전투 원칙</small>“${esc(lore.doctrine)}”</blockquote>
      <div class="tiv1-profile-grid"><span><small>성정</small><b>${esc(lore.temperament)}</b></span><span><small>목소리</small><b>${esc(lore.voice)}</b></span><span><small>주무기</small><b>${esc(lore.weapon)}</b></span><span><small>갑주</small><b>${esc(lore.armor)}</b></span><span><small>외형 표식</small><b>${esc(lore.mark)}</b></span><span><small>전용기</small><b>${esc(hero.skill?.name || '기본 전술')}</b></span></div>
      <div class="tiv1-stat-row"><span><small>HP</small><b>${stats.hp}</b></span><span><small>공격</small><b>${stats.attack}</b></span><span><small>방어</small><b>${stats.defense}</b></span><span><small>책략</small><b>${stats.magic}</b></span><span><small>속도</small><b>${stats.speed}</b></span></div>
      <section class="tiv1-equipment"><h3>현재 장비</h3>${equipment.map(({ slot, item }) => `<span data-slot="${slot}"><i>${item.icon}</i><b>${esc(item.name)}</b><small>${esc(item.description)}</small></span>`).join('') || '<p>장비 정보 없음</p>'}</section>
      ${lore.relations.length ? `<section class="tiv1-relations"><h3>관계와 긴장</h3>${lore.relations.map((relation) => `<span>${esc(relation)}</span>`).join('')}</section>` : ''}
      <footer><span>${esc(hero.passive?.name || '고유 성향')}</span><p>${esc(hero.passive?.description || lore.doctrine)}</p></footer>
    </div>
  </article>`;
}

function openDossier(heroId) {
  if (!HERO_LORE[heroId]) return;
  closeModal();
  modal = document.createElement('div');
  modal.className = 'tiv1-modal';
  modal.innerHTML = `<button class="tiv1-backdrop" data-tiv1-close aria-label="닫기"></button><section><button class="tiv1-close" data-tiv1-close type="button">×</button>${dossierMarkup(heroId)}</section>`;
  document.body.append(modal);
  requestAnimationFrame(() => modal?.classList.add('show'));
}

function openCodex() {
  closeModal();
  modal = document.createElement('div');
  modal.className = 'tiv1-modal tiv1-codex-modal';
  modal.innerHTML = `<button class="tiv1-backdrop" data-tiv1-close aria-label="닫기"></button><section><header><div><small>OFFICER ARCHIVE</small><h2>장수 인물록</h2><p>이름뿐 아니라 출신·나이·체형·무기·성정·관계까지 확인할 수 있습니다.</p></div><button class="tiv1-close" data-tiv1-close type="button">×</button></header><div class="tiv1-codex-grid">${Object.keys(HERO_LORE).filter((id) => !id.startsWith('soldier')).map((heroId) => {
    const lore = HERO_LORE[heroId];
    return `<button data-tiv1-profile="${heroId}" type="button"><span>${renderHeroBust(heroId, 'card')}</span><div><small>${esc(lore.origin)} · ${lore.age}세</small><b>${esc(lore.name)}</b><p>${esc(lore.temperament)} · ${esc(lore.weapon)}</p></div></button>`;
  }).join('')}</div></section>`;
  document.body.append(modal);
  requestAnimationFrame(() => modal?.classList.add('show'));
}

function closeModal() {
  if (!modal) return;
  const current = modal;
  modal = null;
  current.classList.remove('show');
  setTimeout(() => current.remove(), 190);
}

function installProfileTriggers() {
  document.querySelectorAll('.roster-card[data-hero]:not([data-tiv1-profile-ready])').forEach((card) => {
    const heroId = card.dataset.hero;
    if (!HERO_LORE[heroId]) return;
    card.dataset.tiv1ProfileReady = '1';
    card.insertAdjacentHTML('beforeend', `<span class="tiv1-profile-trigger" data-tiv1-profile="${heroId}" role="button" tabindex="0">인물록</span>`);
  });
  document.querySelectorAll('.commercial-officer-card[data-commercial-select]:not([data-tiv1-profile-ready])').forEach((card) => {
    const heroId = card.dataset.commercialSelect;
    if (!HERO_LORE[heroId]) return;
    card.dataset.tiv1ProfileReady = '1';
    card.insertAdjacentHTML('beforeend', `<span class="tiv1-profile-trigger small" data-tiv1-profile="${heroId}" role="button" tabindex="0">인물</span>`);
  });
}

function installCodexShortcut() {
  document.querySelectorAll('.utility-bar:not([data-tiv1-codex])').forEach((bar) => {
    bar.dataset.tiv1Codex = '1';
    const actions = bar.lastElementChild;
    actions?.insertAdjacentHTML('afterbegin', '<button class="icon-button tiv1-codex-shortcut" data-tiv1-codex type="button" aria-label="장수 인물록">將</button>');
  });
}

function cellCoordinate(cell) {
  return { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
}
function unitCoordinate(unit) {
  const style = getComputedStyle(unit);
  const x = Number(unit.dataset.x ?? style.getPropertyValue('--x'));
  const y = Number(unit.dataset.y ?? style.getPropertyValue('--y'));
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
function unitThreatRadius(unit) {
  const heroId = heroIdFrom(unit);
  const profile = HERO_LORE[heroId];
  if (!profile) return 1;
  if (['bow','fan','scroll'].includes(profile.weaponShape)) return 3;
  if (['spear','guandao','halberd'].includes(profile.weaponShape)) return 2;
  return 1;
}

function updateThreatOverlay(root) {
  root.querySelectorAll('.battle-cell[data-x][data-y]').forEach((cell) => { delete cell.dataset.threat; });
  if (!prefs.threat) return;
  const enemies = [...root.querySelectorAll('.battle-unit.enemy')].map((unit) => ({ unit, coordinate: unitCoordinate(unit), radius: unitThreatRadius(unit) })).filter((entry) => entry.coordinate);
  root.querySelectorAll('.battle-cell[data-x][data-y]').forEach((cell) => {
    const coordinate = cellCoordinate(cell);
    let level = 0;
    for (const enemy of enemies) {
      const distance = Math.abs(coordinate.x - enemy.coordinate.x) + Math.abs(coordinate.y - enemy.coordinate.y);
      if (distance <= enemy.radius) level += enemy.radius >= 3 ? 2 : 1;
    }
    if (level) cell.dataset.threat = String(clamp(level, 1, 3));
  });
}

function installBattleToolbar() {
  const screen = document.querySelector('.battle-screen');
  if (!screen) return;
  screen.classList.toggle('tiv1-terrain-labels', prefs.terrain);
  screen.classList.toggle('tiv1-compact-units', prefs.compact);
  screen.dataset.tiv1Density = prefs.density;
  let toolbar = screen.querySelector('.tiv1-tactical-toolbar');
  if (!toolbar) {
    toolbar = document.createElement('nav');
    toolbar.className = 'tiv1-tactical-toolbar';
    toolbar.setAttribute('aria-label', '전술 표시 옵션');
    toolbar.innerHTML = `<span><small>TACTICAL VIEW</small><b>전술 정보</b></span>
      <button data-tiv1-tool="threat" type="button">위험 범위</button>
      <button data-tiv1-tool="terrain" type="button">지형 정보</button>
      <button data-tiv1-tool="compact" type="button">소형 부대</button>
      <button data-tiv1-tool="density" type="button">HUD 밀도</button>
      <button data-tiv1-codex type="button">장수 인물록</button>`;
    screen.querySelector('.objective-bar')?.insertAdjacentElement('afterend', toolbar);
  }
  toolbar.querySelector('[data-tiv1-tool="threat"]')?.classList.toggle('active', prefs.threat);
  toolbar.querySelector('[data-tiv1-tool="terrain"]')?.classList.toggle('active', prefs.terrain);
  toolbar.querySelector('[data-tiv1-tool="compact"]')?.classList.toggle('active', prefs.compact);
  toolbar.querySelector('[data-tiv1-tool="density"]')?.classList.toggle('active', prefs.density === 'dense');
  updateThreatOverlay(screen);
}

function selectedUnit() {
  return document.querySelector('.battle-unit.player.selected,.battle-unit.selected');
}
function parseHp(unit) {
  const text = unit?.querySelector('.unit-label span,.unit-hp-text')?.textContent || '';
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) return { hp: Number(match[1]), maxHp: Number(match[2]) };
  return { hp: Number(unit?.dataset.hp || 0), maxHp: Number(unit?.dataset.maxHp || 1) };
}
function selectedTerrain() {
  const selected = selectedUnit();
  const coordinate = selected && unitCoordinate(selected);
  if (!coordinate) return null;
  return document.querySelector(`.battle-cell[data-x="${coordinate.x}"][data-y="${coordinate.y}"]`);
}

function installUnitInspector() {
  const panel = document.querySelector('.unit-command-panel');
  const selected = selectedUnit();
  if (!panel || !selected) return;
  const heroId = heroIdFrom(selected);
  const lore = HERO_LORE[heroId];
  const hero = HEROES[heroId];
  if (!lore || !hero) return;
  const hp = parseHp(selected);
  const morale = Math.round(clamp(hp.hp / Math.max(1, hp.maxHp), 0, 1) * 100);
  const terrainCell = selectedTerrain();
  const terrainId = [...(terrainCell?.classList || [])].find((name) => name.startsWith('terrain-'))?.replace('terrain-', '') || '';
  const terrain = TERRAIN[terrainId];
  let inspector = panel.querySelector('.tiv1-unit-inspector');
  if (!inspector) {
    inspector = document.createElement('section');
    inspector.className = 'tiv1-unit-inspector';
    panel.append(inspector);
  }
  const signature = `${heroId}:${hp.hp}:${hp.maxHp}:${terrainId}:${morale}`;
  if (inspector.dataset.signature === signature) return;
  inspector.dataset.signature = signature;
  inspector.dataset.hero = heroId;
  inspector.innerHTML = `<header><span>${renderHeroBust(heroId, 'medium')}</span><div><small>${esc(lore.origin)} · ${esc(lore.build)}</small><b>${esc(lore.name)} <em>${esc(lore.courtesy ? `자 ${lore.courtesy}` : '')}</em></b><p>${esc(lore.doctrine)}</p></div><button data-tiv1-profile="${heroId}" type="button">상세</button></header>
    <div class="tiv1-readiness"><span><small>전투 의지</small><i><b style="width:${morale}%"></b></i><em>${morale}</em></span><span><small>현재 지형</small><b>${esc(terrain?.name || '평지')}</b></span><span><small>주무기</small><b>${esc(lore.weapon)}</b></span></div>
    <div class="tiv1-doctrine"><small>행동 원칙</small><p>${esc(lore.temperament)} · ${esc(hero.passive?.name || '고유 성향')}</p></div>`;
}

function enhanceTurnList() {
  document.querySelectorAll('.turn-list button:not([data-tiv1-turn])').forEach((button) => {
    button.dataset.tiv1Turn = '1';
    const heroId = heroIdFrom(button);
    if (!HERO_LORE[heroId]) return;
    button.title = `${HERO_LORE[heroId].name} · ${HERO_LORE[heroId].weapon} · ${HERO_LORE[heroId].temperament}`;
  });
}

function enhanceStory() {
  const screen = document.querySelector('.story-screen:not([data-tiv1-story])');
  if (!screen) return;
  screen.dataset.tiv1Story = '1';
  const name = screen.querySelector('.story-panel small')?.textContent?.trim() || '';
  const heroId = NAME_TO_ID.get(name);
  const lore = HERO_LORE[heroId];
  if (!lore) return;
  screen.querySelector('.story-panel')?.insertAdjacentHTML('beforeend', `<aside class="tiv1-story-context"><span>${esc(lore.origin)} · ${lore.age}세</span><b>${esc(lore.temperament)}</b><p>${esc(lore.mark)}</p><button data-tiv1-profile="${heroId}" type="button">인물 기록 보기</button></aside>`);
}

function applyTool(tool) {
  if (tool === 'threat') prefs.threat = !prefs.threat;
  else if (tool === 'terrain') prefs.terrain = !prefs.terrain;
  else if (tool === 'compact') prefs.compact = !prefs.compact;
  else if (tool === 'density') prefs.density = prefs.density === 'dense' ? 'normal' : 'dense';
  savePrefs();
  schedule();
}

function enhance() {
  scheduled = false;
  installProfileTriggers();
  installCodexShortcut();
  installBattleToolbar();
  installUnitInspector();
  enhanceTurnList();
  enhanceStory();
  document.documentElement.classList.add('tactical-intel-v1-ready');
  window.__tacticalIntelV1 = {
    ready: true,
    version: TACTICAL_INTEL_VERSION,
    profiles: Object.keys(HERO_LORE).length,
    tools: ['threat-overlay','terrain-labels','compact-units','hud-density','officer-codex','selected-unit-dossier'],
    preferences: { ...prefs },
  };
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(enhance);
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-tiv1-profile]') : null;
    if (trigger) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const profile = target.closest('[data-tiv1-profile]');
    if (profile) { event.preventDefault(); event.stopPropagation(); openDossier(profile.dataset.tiv1Profile); return; }
    if (target.closest('[data-tiv1-codex]')) { event.preventDefault(); openCodex(); return; }
    if (target.closest('[data-tiv1-close]')) { event.preventDefault(); closeModal(); return; }
    const tool = target.closest('[data-tiv1-tool]')?.dataset.tiv1Tool;
    if (tool) { event.preventDefault(); applyTool(tool); }
  }, true);
  document.addEventListener('keydown', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-tiv1-profile]') : null;
    if (trigger && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDossier(trigger.dataset.tiv1Profile); }
    if (event.key === 'Escape') closeModal();
  });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style','data-hp'] });
  schedule();
}
