import { CLASSES, HEROES, TERRAIN } from './content.js';
import { HERO_LORE, renderHeroBust } from './commercial-character-v4.js';

export const COMBAT_FORECAST_VERSION = '1.0.0';
let panel = null;
let scheduled = false;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const heroIdOf = (unit) => unit?.dataset.hero || unit?.querySelector('[data-hero-id]')?.dataset.heroId || '';
const coordinate = (unit) => ({ x: Number(unit?.dataset.x ?? 0), y: Number(unit?.dataset.y ?? 0) });
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function hpOf(unit) {
  const text = unit?.querySelector('.unit-label span,.unit-hp-text')?.textContent || '';
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) return { hp: Number(match[1]), max: Number(match[2]) };
  return { hp: Number(unit?.dataset.hp || 0), max: Number(unit?.dataset.maxHp || 1) };
}
function terrainOf(unit) {
  const pos = coordinate(unit);
  const cell = document.querySelector(`.battle-cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
  const id = [...(cell?.classList || [])].find((name) => name.startsWith('terrain-'))?.replace('terrain-', '') || 'grass';
  return TERRAIN[id] || TERRAIN.grass;
}
function classMod(attacker, defender) {
  const a = CLASSES[HEROES[attacker]?.classId];
  const d = HEROES[defender]?.classId;
  if (!a) return { value:1, label:'상성 없음' };
  if (a.strong === d) return { value:1.2, label:'병종 우세' };
  if (a.weak === d) return { value:.85, label:'병종 열세' };
  return { value:1, label:'병종 대등' };
}
function rangeOf(heroId) { return CLASSES[HEROES[heroId]?.classId]?.range || [1,1]; }
function estimate(attackerId, defenderId, defenderTerrain) {
  const attacker = HEROES[attackerId];
  const defender = HEROES[defenderId];
  if (!attacker || !defender) return null;
  const mod = classMod(attackerId, defenderId);
  const defense = defender.defense + (defenderTerrain?.defense || 0);
  const center = Math.max(4, Math.round((attacker.attack * 1.3 - defense * .72 + 8) * mod.value));
  return {
    low: Math.max(1, Math.round(center * .92)),
    high: Math.max(1, Math.round(center * 1.08)),
    crit: Math.max(4, Math.min(38, Math.round(8 + Math.max(0, attacker.speed - defender.speed) * .8))),
    hit: Math.max(62, Math.min(99, 94 - Math.max(0, defenderTerrain?.evade || 0))),
    mod,
  };
}
function counterPossible(attackerUnit, defenderUnit) {
  const d = distance(coordinate(attackerUnit), coordinate(defenderUnit));
  const [min,max] = rangeOf(heroIdOf(defenderUnit));
  return d >= min && d <= max;
}
function close() { panel?.remove(); panel = null; }
function open(attackerUnit, defenderUnit) {
  const attackerId = heroIdOf(attackerUnit);
  const defenderId = heroIdOf(defenderUnit);
  if (!HEROES[attackerId] || !HEROES[defenderId]) return;
  const terrain = terrainOf(defenderUnit);
  const forecast = estimate(attackerId, defenderId, terrain);
  if (!forecast) return;
  const attackerHp = hpOf(attackerUnit);
  const defenderHp = hpOf(defenderUnit);
  const counter = counterPossible(attackerUnit, defenderUnit);
  close();
  panel = document.createElement('aside');
  panel.className = 'cf1-panel';
  panel.innerHTML = `<header><small>COMBAT FORECAST</small><b>교전 예측</b><button data-cf1-close type="button">×</button></header>
    <div class="cf1-versus">
      <article class="player"><span>${renderHeroBust(attackerId,'medium')}</span><div><small>공격</small><b>${esc(HERO_LORE[attackerId]?.name || HEROES[attackerId].name)}</b><em>${attackerHp.hp}/${attackerHp.max}</em></div></article>
      <strong>VS</strong>
      <article class="enemy"><span>${renderHeroBust(defenderId,'medium')}</span><div><small>방어</small><b>${esc(HERO_LORE[defenderId]?.name || HEROES[defenderId].name)}</b><em>${defenderHp.hp}/${defenderHp.max}</em></div></article>
    </div>
    <div class="cf1-numbers"><span><small>예상 피해</small><b>${forecast.low}–${forecast.high}</b></span><span><small>명중률</small><b>${forecast.hit}%</b></span><span><small>치명타</small><b>${forecast.crit}%</b></span></div>
    <div class="cf1-factors"><span class="${forecast.mod.value > 1 ? 'good' : forecast.mod.value < 1 ? 'bad' : ''}">${forecast.mod.label}</span><span>${esc(terrain.name)} 방어 +${terrain.defense || 0}</span><span class="${counter ? 'warn' : 'good'}">${counter ? '반격 가능' : '반격 불가'}</span></div>
    <p>실제 피해는 장비·상태·치명타·전투 난수에 따라 달라집니다.</p>`;
  document.body.append(panel);
  requestAnimationFrame(() => panel?.classList.add('show'));
}
function enhance() {
  scheduled = false;
  document.documentElement.classList.add('combat-forecast-v1-ready');
  window.__combatForecastV1 = { ready:true, version:COMBAT_FORECAST_VERSION, metrics:['damage-range','hit-rate','critical-rate','class-matchup','terrain-defense','counter'] };
}
function schedule(){ if(scheduled) return; scheduled=true; requestAnimationFrame(enhance); }

if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-cf1-close]')) { close(); return; }
    const enemy = target.closest('.battle-unit.enemy');
    if (!enemy) return;
    const attacker = document.querySelector('.battle-unit.player.selected,.battle-unit.selected.player');
    if (attacker) open(attacker, enemy);
  }, true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  schedule();
}
