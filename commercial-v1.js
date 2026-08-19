import { CHAPTER, CLASSES, HEROES, PLAYER_ROSTER, SAVE_KEY, TERRAIN } from './content.js';
import { forecastAction } from './engine.js';
import {
  EQUIPMENT, applyExperience, heroGrowthStats, loadCommercialMeta,
  saveCommercialMeta, xpForLevel,
} from './commercial-data.js';

const RELEASE = '0.7.0';
const SLOT_LABELS = { weapon: '무기', armor: '방어구', accessory: '장신구' };
let meta = loadCommercialMeta();
let scheduled = false;
let modalOpen = false;
let forecastTarget = null;
let bypassForecast = false;
let suppressedTarget = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function loadMainSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}

function writeMeta(next = meta) {
  meta = saveCommercialMeta(next);
  return meta;
}

function heroSvg(heroId, size = 'medium') {
  const hero = HEROES[heroId];
  return hero ? `<svg class="hero-portrait ${size}" viewBox="0 0 100 132" role="img" aria-label="${escapeHtml(hero.name)}"></svg>` : '';
}

function equippedItems(heroId) {
  return Object.entries(meta.loadouts?.[heroId] || {}).map(([slot, itemId]) => ({ slot, item: EQUIPMENT[itemId] })).filter(({ item }) => item);
}

function equipmentAllowed(heroId, item) {
  return !item?.classes?.length || item.classes.includes(HEROES[heroId]?.classId);
}

function statText(stats = {}) {
  const labels = { hp: 'HP', attack: '공격', defense: '방어', magic: '책략', speed: '속도' };
  return Object.entries(stats).filter(([, value]) => value).map(([key, value]) => `${labels[key]} ${value > 0 ? '+' : ''}${value}`).join(' · ');
}

function growthCard(heroId) {
  const hero = HEROES[heroId];
  const growth = heroGrowthStats(heroId, meta);
  const level = growth.level;
  const needed = xpForLevel(level);
  const equipment = equippedItems(heroId);
  return `<button class="commercial-officer-card" data-commercial-select="${heroId}" type="button">
    <span class="commercial-officer-art">${heroSvg(heroId, 'medium')}</span>
    <span class="commercial-officer-copy"><small>Lv.${level} · ${CLASSES[hero.classId].name}</small><b>${hero.name}</b><i><em style="width:${Math.min(100, growth.xp / needed * 100)}%"></em></i><span>${growth.xp}/${needed} XP · 전력 ${growth.score}</span></span>
    <span class="commercial-gear-mini">${equipment.map(({ item }) => `<i title="${item.name}">${item.icon}</i>`).join('') || '<i>空</i>'}</span>
  </button>`;
}

function enhanceUtility(root = document) {
  root.querySelectorAll('.utility-bar:not([data-commercial-tools])').forEach((bar) => {
    bar.dataset.commercialTools = '1';
    const actions = bar.lastElementChild;
    actions?.insertAdjacentHTML('afterbegin', '<button data-commercial-armory class="icon-button commercial-armory-shortcut" type="button" aria-label="무장 성장과 장비">兵</button>');
  });
}

function enhanceHub(root = document) {
  const hub = root.querySelector('.hub-screen:not([data-commercial-hub])');
  if (!hub) return;
  hub.dataset.commercialHub = '1';
  const target = hub.querySelector('.facility-section');
  target?.insertAdjacentHTML('afterend', `<section class="commercial-growth-section">
    <div class="commercial-section-heading"><div><small>OFFICER DEVELOPMENT</small><h2>무장 성장과 장비</h2><p>전투 경험과 장비 편성이 다음 출전 능력치에 직접 반영됩니다.</p></div><button data-commercial-armory type="button">병기고 열기 <b>→</b></button></div>
    <div class="commercial-officer-strip">${PLAYER_ROSTER.map(growthCard).join('')}</div>
    <div class="commercial-mastery"><span>군단 숙련도</span><b>${meta.mastery}</b><p>전투 성과로 획득하며 장수 훈련에 사용합니다.</p></div>
  </section>`);
}

function enhanceRoster(root = document) {
  root.querySelectorAll('.roster-card[data-hero]:not([data-commercial-card])').forEach((card) => {
    const heroId = card.dataset.hero;
    const growth = heroGrowthStats(heroId, meta);
    if (!growth) return;
    card.dataset.commercialCard = '1';
    card.querySelector('.roster-copy small')?.insertAdjacentHTML('afterend', `<span class="commercial-level-badge">Lv.${growth.level}</span>`);
    card.querySelector('.mini-stats')?.insertAdjacentHTML('afterend', `<div class="commercial-card-power"><span>종합 전력</span><b>${growth.score}</b><button data-commercial-select="${heroId}" type="button">성장·장비</button></div>`);
  });
}

function rewardFingerprint(save) {
  const battle = save?.battle;
  if (!battle?.result) return '';
  return [battle.result.outcome, battle.result.reason, battle.turn, save.records?.victories || 0, save.records?.defeats || 0].join(':');
}

function applyResultGrowth(save) {
  const key = rewardFingerprint(save);
  if (!key) return null;
  if (meta.rewardKeys.includes(key)) return meta.lastGrowth?.key === key ? meta.lastGrowth : null;
  const battle = save.battle;
  const victory = battle.result.outcome === 'victory';
  const survivors = battle.units.filter((unit) => unit.team === 'player' && !unit.dead && unit.hp > 0).length;
  const xp = victory ? 46 + Math.max(0, CHAPTER.turnLimit - battle.turn) * 4 : 18;
  const details = [];
  (save.party || []).forEach((heroId) => {
    const result = applyExperience(meta, heroId, xp);
    meta = result.meta;
    details.push({ heroId, xp, levels: result.levels, level: result.growth.level });
  });
  let mastery = victory ? 2 : 1;
  if (victory && battle.turn <= 8) mastery += 1;
  if (victory && survivors === 4) mastery += 1;
  if (victory && battle.result.reason === 'command-captured') mastery += 1;
  meta.mastery += mastery;
  meta.battles += 1;
  let loot = '';
  if (victory) {
    const table = ['imperial-sabre', 'black-iron-armor', 'phoenix-talisman'];
    loot = table.find((itemId) => !meta.inventory.includes(itemId)) || '';
    if (loot) {
      meta.inventory.push(loot);
      meta.lootHistory.push(loot);
    }
  }
  const growth = { key, victory, xp, mastery, loot, details, survivors, turn: battle.turn };
  meta.rewardKeys.push(key);
  meta.rewardKeys = meta.rewardKeys.slice(-30);
  meta.lastGrowth = growth;
  writeMeta(meta);
  return growth;
}

function growthRewardMarkup(growth) {
  if (!growth) return '';
  const loot = growth.loot ? EQUIPMENT[growth.loot] : null;
  return `<article class="commercial-result-card">
    <div><small>OFFICER GROWTH</small><h2>장수 성장</h2><p>${growth.victory ? '전공이 경험과 군단 숙련도로 축적됐습니다.' : '퇴각 기록에서도 실전 경험을 얻었습니다.'}</p></div>
    <div class="commercial-result-officers">${growth.details.map(({ heroId, xp, levels, level }) => `<span>${heroSvg(heroId, 'tiny')}<i><b>${HEROES[heroId].name} Lv.${level}</b><small>+${xp} XP${levels ? ` · LEVEL UP ×${levels}` : ''}</small></i></span>`).join('')}</div>
    <div class="commercial-result-gains"><span><small>숙련도</small><b>+${growth.mastery}</b></span>${loot ? `<span class="loot"><small>전리품</small><b>${loot.icon} ${loot.name}</b></span>` : '<span><small>전리품</small><b>다음 승리를 노리십시오</b></span>'}</div>
    <button data-commercial-armory type="button">성장과 장비 확인 <b>→</b></button>
  </article>`;
}

function enhanceResult(root = document) {
  const result = root.querySelector('.result-screen:not([data-commercial-result])');
  if (!result) return;
  result.dataset.commercialResult = '1';
  const save = loadMainSave();
  const growth = applyResultGrowth(save);
  result.querySelector('.result-grid')?.insertAdjacentHTML('afterend', growthRewardMarkup(growth));
}

function armoryHeroNav(selectedHero) {
  return PLAYER_ROSTER.map((heroId) => {
    const growth = heroGrowthStats(heroId, meta);
    return `<button class="${selectedHero === heroId ? 'selected' : ''}" data-commercial-hero="${heroId}" type="button">${heroSvg(heroId, 'tiny')}<span><b>${HEROES[heroId].name}</b><small>Lv.${growth.level} · ${growth.score}</small></span></button>`;
  }).join('');
}

function equipmentSlot(heroId, slot) {
  const itemId = meta.loadouts?.[heroId]?.[slot];
  const item = EQUIPMENT[itemId];
  return `<article class="commercial-slot ${item ? 'filled' : ''}"><small>${SLOT_LABELS[slot]}</small><span>${item?.icon || '＋'}</span><div><b>${item?.name || '장비 없음'}</b><p>${item ? statText(item.stats) : '보유 장비에서 선택'}</p></div>${item ? `<button data-commercial-unequip="${slot}" type="button">해제</button>` : ''}</article>`;
}

function inventoryMarkup(heroId) {
  const hero = HEROES[heroId];
  return meta.inventory.map((itemId) => {
    const item = EQUIPMENT[itemId];
    const allowed = equipmentAllowed(heroId, item);
    const equipped = meta.loadouts?.[heroId]?.[item.slot] === itemId;
    return `<button class="commercial-item ${equipped ? 'equipped' : ''}" data-commercial-equip="${itemId}" ${allowed ? '' : 'disabled'} type="button"><span>${item.icon}</span><div><small>${item.rarity} · ${SLOT_LABELS[item.slot]}</small><b>${item.name}</b><p>${item.description}</p><i>${statText(item.stats)}</i></div><em>${equipped ? '장착 중' : allowed ? '장착' : `${CLASSES[hero.classId].name} 장착 불가`}</em></button>`;
  }).join('');
}

function renderArmoryBody(heroId) {
  const hero = HEROES[heroId];
  const growth = heroGrowthStats(heroId, meta);
  const needed = xpForLevel(growth.level);
  const trainingCost = 1 + Math.floor((growth.level - 1) / 5);
  return `<div class="commercial-armory-layout">
    <nav class="commercial-hero-nav">${armoryHeroNav(heroId)}</nav>
    <section class="commercial-hero-detail">
      <div class="commercial-detail-head"><span class="commercial-detail-art">${heroSvg(heroId, 'story')}</span><div><small>${CLASSES[hero.classId].icon} ${CLASSES[hero.classId].name} · ${hero.title}</small><h2>${hero.name}</h2><p>${hero.passive?.name} · ${hero.passive?.description}</p><div class="commercial-xp"><span>Lv.${growth.level}</span><i><b style="width:${Math.min(100, growth.xp / needed * 100)}%"></b></i><em>${growth.xp}/${needed}</em></div><button data-commercial-train="${heroId}" ${meta.mastery < trainingCost || growth.level >= 20 ? 'disabled' : ''} type="button">${growth.level >= 20 ? '최대 레벨' : `집중 훈련 · 숙련도 ${trainingCost}`}</button></div></div>
      <div class="commercial-stat-grid"><span><small>HP</small><b>${growth.hp}</b></span><span><small>공격</small><b>${growth.attack}</b></span><span><small>방어</small><b>${growth.defense}</b></span><span><small>책략</small><b>${growth.magic}</b></span><span><small>속도</small><b>${growth.speed}</b></span><span class="power"><small>종합 전력</small><b>${growth.score}</b></span></div>
      <div class="commercial-equipped"><h3>현재 장비</h3>${['weapon', 'armor', 'accessory'].map((slot) => equipmentSlot(heroId, slot)).join('')}</div>
      <div class="commercial-inventory"><div><h3>보유 장비</h3><span>${meta.inventory.length}종</span></div>${inventoryMarkup(heroId)}</div>
    </section>
  </div>`;
}

function openArmory(heroId = meta.selectedHero || 'cao') {
  if (modalOpen) return;
  meta.selectedHero = HEROES[heroId] ? heroId : 'cao';
  writeMeta(meta);
  modalOpen = true;
  const modal = document.createElement('div');
  modal.className = 'commercial-modal commercial-armory-modal';
  modal.innerHTML = `<div class="commercial-backdrop" data-commercial-close></div><section><header><div><small>OFFICER DEVELOPMENT</small><b>장수 성장 · 병기고</b><span>군단 숙련도 ${meta.mastery}</span></div><button data-commercial-close type="button">×</button></header><div class="commercial-modal-scroll">${renderArmoryBody(meta.selectedHero)}</div><footer><span>장비와 레벨 보너스는 다음 전투 생성 시 실제 능력치에 적용됩니다.</span><button data-commercial-close type="button">게임으로 돌아가기</button></footer></section>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
}

function rerenderArmory(heroId = meta.selectedHero) {
  meta.selectedHero = heroId;
  writeMeta(meta);
  const modal = document.querySelector('.commercial-armory-modal');
  if (!modal) return;
  modal.querySelector('header span').textContent = `군단 숙련도 ${meta.mastery}`;
  modal.querySelector('.commercial-modal-scroll').innerHTML = renderArmoryBody(heroId);
  schedule();
}

function closeModal() {
  const modal = document.querySelector('.commercial-modal');
  if (!modal) return;
  modal.classList.remove('show');
  window.setTimeout(() => { modal.remove(); modalOpen = false; }, 230);
}

function trainHero(heroId) {
  const growth = meta.progression[heroId];
  const cost = 1 + Math.floor((growth.level - 1) / 5);
  if (growth.level >= 20 || meta.mastery < cost) return;
  meta.mastery -= cost;
  const result = applyExperience(meta, heroId, xpForLevel(growth.level));
  meta = result.meta;
  writeMeta(meta);
  rerenderArmory(heroId);
}

function equip(heroId, itemId) {
  const item = EQUIPMENT[itemId];
  if (!item || !meta.inventory.includes(itemId) || !equipmentAllowed(heroId, item)) return;
  meta.loadouts[heroId] ||= {};
  meta.loadouts[heroId][item.slot] = itemId;
  writeMeta(meta);
  rerenderArmory(heroId);
}

function unequip(heroId, slot) {
  if (meta.loadouts?.[heroId]) meta.loadouts[heroId][slot] = null;
  writeMeta(meta);
  rerenderArmory(heroId);
}

function activeCommand() {
  return document.querySelector('.command-grid button.active[data-action]')?.dataset.action || '';
}

function currentBattleState() {
  return loadMainSave()?.battle || null;
}

function forecastMarkup(forecast) {
  const attacker = HEROES[forecast.attackerHeroId];
  const defender = HEROES[forecast.targetHeroId];
  if (forecast.kind === 'heal') return `<div class="commercial-forecast-main heal"><span>${heroSvg(forecast.attackerHeroId, 'medium')}</span><div><small>${attacker.name} · ${forecast.skillName}</small><h2>${defender.name} 회복</h2><strong>+${forecast.amount} HP</strong><p>기술력 ${forecast.skillCost} 소모 · 반격 없음</p></div><span>${heroSvg(forecast.targetHeroId, 'medium')}</span></div>`;
  if (forecast.kind === 'utility') return `<div class="commercial-forecast-main utility"><span>${heroSvg(forecast.attackerHeroId, 'medium')}</span><div><small>${attacker.name}</small><h2>${forecast.skillName}</h2><strong>${escapeHtml(forecast.description)}</strong><p>기술력 ${forecast.skillCost} 소모</p></div></div>`;
  return `<div class="commercial-forecast-main"><span>${heroSvg(forecast.attackerHeroId, 'medium')}</span><div class="commercial-versus"><small>${forecast.skillName || '일반 공격'}</small><h2>${attacker.name} <i>VS</i> ${defender.name}</h2><div class="commercial-damage-range"><span><small>예상 피해</small><b>${forecast.minDamage}~${forecast.maxDamage}</b></span><span><small>명중</small><b>${forecast.hitChance}%</b></span><span><small>치명타</small><b>${forecast.criticalChance}%</b></span></div><p>${forecast.advantageLabel} · ${forecast.terrain.name} 방어 +${forecast.terrain.defense}${forecast.shield ? ` · 보호막 ${forecast.shield}` : ''}</p>${forecast.counter ? `<div class="commercial-counter"><small>예상 반격</small><b>${forecast.counter.minDamage}~${forecast.counter.maxDamage}</b></div>` : '<div class="commercial-counter safe"><small>반격</small><b>없음</b></div>'}${forecast.lethal ? '<em class="commercial-lethal">격파 가능</em>' : ''}</div><span>${heroSvg(forecast.targetHeroId, 'medium')}</span></div>`;
}

function openForecast(targetElement, forecast) {
  if (!forecast || modalOpen) return;
  modalOpen = true;
  forecastTarget = targetElement;
  const modal = document.createElement('div');
  modal.className = 'commercial-modal commercial-forecast-modal';
  modal.innerHTML = `<div class="commercial-backdrop" data-commercial-forecast-cancel></div><section><header><div><small>TACTICAL FORECAST</small><b>전투 예측</b><span>실행 전에 결과 범위를 확인하십시오</span></div><button data-commercial-forecast-cancel type="button">×</button></header>${forecastMarkup(forecast)}<footer><button data-commercial-forecast-cancel type="button">취소</button><button data-commercial-forecast-confirm class="confirm" type="button">명령 실행 <b>⚔</b></button></footer></section>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
}

function maybeForecast(event) {
  if (bypassForecast || modalOpen) return false;
  const target = event.target instanceof Element ? event.target.closest('.battle-unit.enemy.targetable') : null;
  if (!target) return false;
  const command = activeCommand();
  if (!['command-attack', 'command-skill'].includes(command)) return false;
  const selected = document.querySelector('.battle-unit.player.selected');
  const state = currentBattleState();
  if (!selected || !state) return false;
  const forecast = forecastAction(state, selected.dataset.unit, target.dataset.unit, { skill: command === 'command-skill' });
  if (!forecast?.ok) return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  suppressedTarget = target;
  openForecast(target, forecast);
  return true;
}

function confirmForecast() {
  const target = forecastTarget;
  closeModal();
  forecastTarget = null;
  suppressedTarget = null;
  bypassForecast = true;
  window.setTimeout(() => {
    target?.click();
    window.setTimeout(() => { bypassForecast = false; }, 0);
  }, 250);
}

function enhance() {
  scheduled = false;
  document.documentElement.classList.add('commercial-release-v07');
  enhanceUtility();
  enhanceHub();
  enhanceRoster();
  enhanceResult();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(enhance);
}

document.addEventListener('pointerdown', (event) => { maybeForecast(event); }, true);
document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (!bypassForecast && suppressedTarget && target.closest('.battle-unit') === suppressedTarget) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return;
  }
  const select = target.closest('[data-commercial-select]');
  if (select) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); openArmory(select.dataset.commercialSelect); return; }
  if (target.closest('[data-commercial-armory]')) { event.preventDefault(); openArmory(); return; }
  const hero = target.closest('[data-commercial-hero]');
  if (hero) { event.preventDefault(); rerenderArmory(hero.dataset.commercialHero); return; }
  const equipButton = target.closest('[data-commercial-equip]');
  if (equipButton) { event.preventDefault(); equip(meta.selectedHero, equipButton.dataset.commercialEquip); return; }
  const unequipButton = target.closest('[data-commercial-unequip]');
  if (unequipButton) { event.preventDefault(); unequip(meta.selectedHero, unequipButton.dataset.commercialUnequip); return; }
  const train = target.closest('[data-commercial-train]');
  if (train) { event.preventDefault(); trainHero(train.dataset.commercialTrain); return; }
  if (target.closest('[data-commercial-forecast-confirm]')) { event.preventDefault(); confirmForecast(); return; }
  if (target.closest('[data-commercial-close], [data-commercial-forecast-cancel]')) { event.preventDefault(); forecastTarget = null; suppressedTarget = null; closeModal(); }
}, true);

document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modalOpen) { forecastTarget = null; suppressedTarget = null; closeModal(); } });
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
window.__commercialV07 = { ready: true, version: RELEASE, equipmentCount: Object.keys(EQUIPMENT).length, heroCount: PLAYER_ROSTER.length };
schedule();
