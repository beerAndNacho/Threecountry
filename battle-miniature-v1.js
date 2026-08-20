import { HERO_LORE } from './commercial-character-v4.js';

export const BATTLE_MINIATURE_VERSION = '1.0.0';
const NAME_TO_ID = new Map(Object.entries(HERO_LORE).map(([id, profile]) => [profile.name, id]));
const lastX = new WeakMap();
let scheduled = false;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safe = (value) => String(value).replace(/[^a-z0-9_-]/gi, '-');

function heroIdOf(unit, svg) {
  return unit?.dataset.hero || unit?.dataset.commercialHeroId || svg?.dataset.heroId || NAME_TO_ID.get(svg?.getAttribute('aria-label') || '') || '';
}

function stateOf(unit) {
  if (unit.classList.contains('defeated') || unit.classList.contains('dead') || unit.dataset.dead === 'true') return 'retreat';
  if (unit.classList.contains('ccv3-skill-active') || unit.classList.contains('skill-active') || unit.classList.contains('using-skill')) return 'skill';
  if (unit.classList.contains('ccv3-hit') || unit.classList.contains('hit') || unit.classList.contains('damaged')) return 'hit';
  if (unit.classList.contains('ccv3-attacking') || unit.classList.contains('attacking') || unit.classList.contains('attack-active')) return 'attack';
  if (unit.classList.contains('guarding') || unit.classList.contains('defending')) return 'guard';
  if (unit.classList.contains('moving') || unit.classList.contains('ccv3-moving') || unit.dataset.moving === 'true') return 'walk';
  if (unit.classList.contains('victory')) return 'victory';
  return 'idle';
}

function weapon(profile) {
  const trim = profile.colors[2];
  switch (profile.weaponShape) {
    case 'sword': return `<g class="bm1-weapon bm1-sword"><path d="M123 56L93 146"/><path d="M121 45l12 11-14 7z" fill="${trim}"/><path d="M89 130l17 5"/></g>`;
    case 'dual': return `<g class="bm1-weapon bm1-dual"><path d="M45 74l19 79M126 72l-20 82"/><path d="M43 66l10 8-11 4zM128 64l-10 8 11 4z" fill="${trim}"/></g>`;
    case 'spear': return `<g class="bm1-weapon bm1-spear"><path d="M131 30L103 172"/><path d="M131 20l10 17-16-4z" fill="${trim}"/><path d="M129 38q14 8 20 3" stroke="${profile.colors[1]}" stroke-width="5"/></g>`;
    case 'guandao': return `<g class="bm1-weapon bm1-guandao"><path d="M133 12L102 177"/><path d="M133 10q29 10 8 38q-10-12-23-14q13-8 15-24z" fill="${trim}"/><path d="M130 42q17 7 23 2" stroke="#8d2d2b" stroke-width="6"/></g>`;
    case 'halberd': return `<g class="bm1-weapon bm1-halberd"><path d="M132 18L102 178"/><path d="M131 14l12 18-15-2zM130 29q23 4 11 19q-6-10-17-9z" fill="${trim}"/></g>`;
    case 'shield': return `<g class="bm1-weapon bm1-shield"><path d="M110 105q37 2 31 46q-13 28-31 35q-26-10-31-36q4-41 31-45z" fill="${profile.colors[0]}" stroke="${trim}" stroke-width="4"/><path d="M110 116v57M90 145h40" stroke="${trim}" stroke-width="4"/></g>`;
    case 'fan': return `<g class="bm1-weapon bm1-fan"><path d="M99 128q20-47 51-18q-11 29-51 18z" fill="#e7ddc9" stroke="${trim}" stroke-width="3"/><path d="M106 126l37-14M113 129l25-27M122 130l9-29" stroke="${profile.colors[1]}" stroke-width="2.5"/></g>`;
    case 'scroll': return `<g class="bm1-weapon bm1-scroll"><path d="M91 124q27-10 48 1v33q-23-9-48 1z" fill="#eee2c7" stroke="${trim}" stroke-width="3"/><path d="M101 135h27M101 143h23M101 151h17" stroke="#6b5842" stroke-width="2"/></g>`;
    case 'bow': return `<g class="bm1-weapon bm1-bow"><path d="M133 42q-42 51 0 112"/><path d="M132 42v112M121 98h29"/></g>`;
    default: return '';
  }
}

function beard(profile) {
  if (!profile.beard) return '';
  if (profile.beard === 'long') return '<path class="bm1-beard" d="M72 70q15 17 30 0q4 48-14 72q-15-17-20-44q-3-18 4-28z" fill="#171413"/>';
  if (profile.beard === 'wide' || profile.beard === 'wild') return '<path class="bm1-beard" d="M61 72q12 17 22 8q8 11 17 0q10 10 22-9q0 31-17 42q-12-11-18 7q-7-16-17-5q-13-14-9-43z" fill="#171413"/>';
  return '<path class="bm1-beard" d="M73 76q13 11 25 0q-1 25-13 29q-12-4-12-29z" fill="#171413"/>';
}

function headgear(profile) {
  const [main, sub, trim] = profile.colors;
  if (profile.head === 'hood') return `<path class="bm1-headgear" d="M47 76q-3-58 38-67q42 11 39 67l-21-22q-3-23-18-27q-18 4-20 27z" fill="${main}" stroke="${trim}" stroke-width="3"/>`;
  if (profile.head === 'scholar') return `<g class="bm1-headgear"><path d="M61 58q9-35 40-37q19 9 15 36l-13 10H73z" fill="${main}" stroke="${trim}" stroke-width="3"/><path d="M100 24l29-17" stroke="${trim}" stroke-width="4"/></g>`;
  if (profile.head === 'band' || profile.head === 'soft') return `<g class="bm1-headgear"><path d="M55 58q31-18 62 0l-5 12q-27-12-52 0z" fill="${sub}" stroke="${trim}" stroke-width="3"/><path d="M111 62q28 8 18 24" stroke="${sub}" stroke-width="7"/></g>`;
  const tall = profile.head === 'heavy' ? 7 : 0;
  return `<g class="bm1-headgear"><path d="M53 ${58-tall}q3-${39+tall} 32-${45+tall}q33 7 35 ${45+tall}l-17 13H70z" fill="${main}" stroke="${trim}" stroke-width="3.5"/><path d="M85 ${14-tall}V2q19-3 25 10" stroke="${sub}" stroke-width="7"/><path d="M57 ${51-tall}h59" stroke="${trim}" stroke-width="3"/></g>`;
}

function miniature(heroId) {
  const p = HERO_LORE[heroId];
  if (!p) return '';
  const [main, sub, trim] = p.colors;
  const bodyScale = p.body === 'massive' ? 1.18 : p.body === 'tall' ? 1.05 : p.body === 'slim' ? .87 : 1;
  const skin = p.redFace ? '#a95f51' : p.pale ? '#d6ae91' : '#d2a07e';
  const faceWidth = p.face === 'square' ? 29 : p.face === 'round' ? 28 : p.face === 'long' ? 24 : 25;
  const id = safe(heroId);
  return `<svg class="hero-portrait battle-miniature-v1" viewBox="0 0 160 190" role="img" aria-label="${esc(p.name)}" data-commercial-mini-v1="1" data-hero-id="${esc(heroId)}" data-state="idle">
    <defs><linearGradient id="bm1-armor-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${sub}"/><stop offset="1" stop-color="${main}"/></linearGradient><filter id="bm1-shadow-${id}" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="6" stdDeviation="3" flood-color="#000" flood-opacity=".7"/></filter></defs>
    <ellipse class="bm1-ground-shadow" cx="82" cy="177" rx="43" ry="9" fill="#000" opacity=".42"/>
    <g class="bm1-rig" filter="url(#bm1-shadow-${id})" style="--body-scale:${bodyScale}">
      <path class="bm1-cape" d="M54 86q31-23 60 0l17 79q-48 21-94 0z" fill="${main}" opacity=".84"/>
      <g class="bm1-leg bm1-leg-left"><path d="M68 138l-9 35" stroke="#1b2224" stroke-width="13" stroke-linecap="round"/><path d="M58 172l-15 6" stroke="#171b1d" stroke-width="8" stroke-linecap="round"/></g>
      <g class="bm1-leg bm1-leg-right"><path d="M96 138l8 35" stroke="#1b2224" stroke-width="13" stroke-linecap="round"/><path d="M103 173l15 5" stroke="#171b1d" stroke-width="8" stroke-linecap="round"/></g>
      <g class="bm1-torso" transform="translate(82 112) scale(${bodyScale} 1) translate(-82 -112)"><path d="M43 142q3-61 39-73q38 11 41 73l-19 15H61z" fill="url(#bm1-armor-${id})" stroke="#0e1517" stroke-width="4"/><path d="M55 93h55M52 112h61M50 131h65" stroke="${trim}" stroke-width="3" opacity=".65"/><path d="M37 94q12-27 31-25l12 18-24 32zM128 94q-12-27-31-25l-12 18 24 32z" fill="${main}" stroke="${trim}" stroke-width="3"/><circle cx="82" cy="105" r="14" fill="${main}" stroke="${trim}" stroke-width="3"/><text x="82" y="111" text-anchor="middle" font-size="13" font-weight="900" fill="${trim}">${p.emblem}</text></g>
      <g class="bm1-arm bm1-arm-back"><path d="M109 98l23 29" stroke="${sub}" stroke-width="12" stroke-linecap="round"/></g>
      <g class="bm1-arm bm1-arm-front"><path d="M54 99l-15 35" stroke="${sub}" stroke-width="12" stroke-linecap="round"/></g>
      ${weapon(p)}
      <g class="bm1-head"><ellipse cx="82" cy="60" rx="${faceWidth}" ry="31" fill="${skin}"/><path d="M62 47q20-21 42 0q-8-25-22-26q-14 2-20 26z" fill="#191514"/><path d="M65 58q8-5 15 0M88 58q8-5 15 0" stroke="#2e211e" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="74" cy="58" r="2.2"/><circle cx="96" cy="58" r="2.2"/><path d="M82 62q-4 10 2 12" stroke="#8a5949" stroke-width="2" fill="none"/><path d="M73 79q10 5 20 0" stroke="#6b4037" stroke-width="2.4" fill="none"/>${p.eyepatch ? '<rect x="87" y="49" width="18" height="14" rx="5" fill="#171515" stroke="#d1a65d" stroke-width="2"/><path d="M86 48l22-12" stroke="#171515" stroke-width="4"/>' : ''}${p.scar ? '<path d="M64 66l12 14M102 43l-9 18" stroke="#79362f" stroke-width="2" opacity=".8"/>' : ''}</g>
      ${headgear(p)}${beard(p)}
    </g>
    <g class="bm1-status"><circle cx="133" cy="28" r="12" fill="${main}" stroke="${trim}" stroke-width="2"/><text x="133" y="33" text-anchor="middle" font-size="11" font-weight="900" fill="${trim}">${p.emblem}</text></g>
  </svg>`;
}

function updateUnit(unit) {
  const existing = unit.querySelector('svg.hero-portrait');
  const heroId = heroIdOf(unit, existing);
  if (!heroId || !HERO_LORE[heroId]) return;
  let svg = unit.querySelector('svg[data-commercial-mini-v1]');
  if (!svg) {
    const template = document.createElement('template');
    template.innerHTML = miniature(heroId).trim();
    const next = template.content.firstElementChild;
    if (!next) return;
    existing?.replaceWith(next);
    if (!existing) unit.prepend(next);
    svg = next;
  }
  const x = Number(unit.dataset.x ?? getComputedStyle(unit).getPropertyValue('--x'));
  const previous = lastX.get(unit);
  if (Number.isFinite(x)) {
    if (Number.isFinite(previous) && x !== previous) unit.dataset.facing = x > previous ? 'right' : 'left';
    else if (!unit.dataset.facing) unit.dataset.facing = unit.classList.contains('enemy') ? 'left' : 'right';
    lastX.set(unit, x);
  }
  svg.dataset.state = stateOf(unit);
  svg.dataset.facing = unit.dataset.facing || (unit.classList.contains('enemy') ? 'left' : 'right');
}

function enhance() {
  scheduled = false;
  document.querySelectorAll('.battle-unit').forEach(updateUnit);
  document.documentElement.classList.add('battle-miniature-v1-ready');
  window.__battleMiniatureV1 = {
    ready: true,
    version: BATTLE_MINIATURE_VERSION,
    officerCount: Object.keys(HERO_LORE).length,
    states: ['idle','walk','attack','skill','hit','guard','victory','retreat'],
  };
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(enhance);
}

if (typeof document !== 'undefined') {
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style','data-x','data-y','data-state','data-hp','data-dead'] });
  schedule();
}
