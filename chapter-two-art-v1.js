const VERSION = '1.3.0';
const PROFILES = {
  화웅: { id: 'huaxiong', body: 'wide', face: '#b97859', hair: '#171312', main: '#3d3230', sub: '#9d3f32', trim: '#d0a15d', beard: 'fork', head: 'gate', weapon: 'blade', emblem: '關' },
  가후: { id: 'jiaxu', body: 'slim', face: '#d6a27f', hair: '#201c20', main: '#292432', sub: '#71536f', trim: '#c9a86c', beard: 'thin', head: 'hood', weapon: 'fan', emblem: '毒' },
  여포: { id: 'lubu', body: 'tall', face: '#bf8060', hair: '#171315', main: '#2e2529', sub: '#a62f37', trim: '#d6ad56', beard: 'none', head: 'plume', weapon: 'halberd', emblem: '飛', horse: '#30241f' },
  동탁: { id: 'dongzhuo', body: 'massive', face: '#aa7150', hair: '#181512', main: '#3f3229', sub: '#7f3c2c', trim: '#d1a85e', beard: 'wide', head: 'crown', weapon: 'shield', emblem: '暴' },
  서량기병: { id: 'soldier-xiliang', body: 'normal', face: '#b77d5d', hair: '#211b18', main: '#423930', sub: '#985237', trim: '#c59e5e', beard: 'none', head: 'soldier', weapon: 'spear', emblem: '涼', horse: '#3a3028' },
  연노병: { id: 'soldier-crossbow', body: 'slim', face: '#bd8664', hair: '#282018', main: '#4b463c', sub: '#7c6040', trim: '#c2a366', beard: 'none', head: 'band', weapon: 'bow', emblem: '弩' },
};
const NAME_TO_PROFILE = new Map(Object.entries(PROFILES));
let queued = false;
let serial = 0;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const gid = (prefix, id) => `${prefix}-${id}-${++serial}`;

function head(profile, cx, cy, scale = 1) {
  if (profile.head === 'hood') return `<path d="M${cx-31*scale},${cy+22*scale}Q${cx-34*scale},${cy-18*scale} ${cx},${cy-29*scale}Q${cx+34*scale},${cy-18*scale} ${cx+31*scale},${cy+22*scale}L${cx+20*scale},${cy+7*scale}Q${cx+12*scale},${cy-11*scale} ${cx},${cy-12*scale}Q${cx-13*scale},${cy-9*scale} ${cx-20*scale},${cy+8*scale}Z" fill="${profile.main}" stroke="${profile.trim}"/>`;
  if (profile.head === 'plume') return `<g><path d="M${cx-30*scale},${cy+17*scale}Q${cx-24*scale},${cy-18*scale} ${cx},${cy-24*scale}Q${cx+24*scale},${cy-18*scale} ${cx+30*scale},${cy+17*scale}L${cx+20*scale},${cy+24*scale}H${cx-20*scale}Z" fill="${profile.main}" stroke="${profile.trim}"/><path d="M${cx},${cy-24*scale}V${cy-43*scale}Q${cx+23*scale},${cy-57*scale} ${cx+31*scale},${cy-37*scale}Q${cx+13*scale},${cy-31*scale} ${cx},${cy-35*scale}" fill="none" stroke="${profile.sub}" stroke-width="${6*scale}"/></g>`;
  if (profile.head === 'crown') return `<g><path d="M${cx-25*scale},${cy+15*scale}Q${cx-20*scale},${cy-15*scale} ${cx},${cy-20*scale}Q${cx+20*scale},${cy-15*scale} ${cx+25*scale},${cy+15*scale}Z" fill="${profile.main}" stroke="${profile.trim}"/><path d="M${cx-19*scale},${cy-18*scale}L${cx-10*scale},${cy-33*scale}L${cx},${cy-21*scale}L${cx+10*scale},${cy-34*scale}L${cx+20*scale},${cy-17*scale}" fill="${profile.sub}" stroke="${profile.trim}"/></g>`;
  if (profile.head === 'gate') return `<g><path d="M${cx-31*scale},${cy+18*scale}Q${cx-27*scale},${cy-18*scale} ${cx},${cy-24*scale}Q${cx+27*scale},${cy-18*scale} ${cx+31*scale},${cy+18*scale}L${cx+21*scale},${cy+25*scale}H${cx-21*scale}Z" fill="${profile.main}" stroke="${profile.trim}"/><path d="M${cx-31*scale},${cy+10*scale}H${cx+31*scale}M${cx-20*scale},${cy-2*scale}H${cx+20*scale}" stroke="${profile.trim}" stroke-width="${3*scale}"/></g>`;
  if (profile.head === 'soldier') return `<path d="M${cx-27*scale},${cy+17*scale}Q${cx-25*scale},${cy-16*scale} ${cx},${cy-21*scale}Q${cx+25*scale},${cy-16*scale} ${cx+27*scale},${cy+17*scale}Z" fill="${profile.main}" stroke="${profile.trim}"/>`;
  return `<path d="M${cx-28*scale},${cy+12*scale}Q${cx},${cy-3*scale} ${cx+28*scale},${cy+12*scale}L${cx+23*scale},${cy+19*scale}Q${cx},${cy+8*scale} ${cx-23*scale},${cy+19*scale}Z" fill="${profile.sub}" stroke="${profile.trim}"/>`;
}
function beard(profile, cx, cy, scale = 1) {
  if (profile.beard === 'wide') return `<path d="M${cx-28*scale},${cy-2*scale}Q${cx-15*scale},${cy+16*scale} ${cx-7*scale},${cy+11*scale}Q${cx},${cy+21*scale} ${cx+7*scale},${cy+11*scale}Q${cx+15*scale},${cy+16*scale} ${cx+28*scale},${cy-2*scale}Q${cx+22*scale},${cy+35*scale} ${cx},${cy+42*scale}Q${cx-22*scale},${cy+35*scale} ${cx-28*scale},${cy-2*scale}Z" fill="${profile.hair}"/>`;
  if (profile.beard === 'fork') return `<path d="M${cx-17*scale},${cy}Q${cx},${cy+17*scale} ${cx+17*scale},${cy}Q${cx+14*scale},${cy+30*scale} ${cx+5*scale},${cy+45*scale}L${cx},${cy+32*scale}L${cx-6*scale},${cy+45*scale}Q${cx-15*scale},${cy+28*scale} ${cx-17*scale},${cy}Z" fill="${profile.hair}"/>`;
  if (profile.beard === 'thin') return `<path d="M${cx-12*scale},${cy}Q${cx},${cy+12*scale} ${cx+12*scale},${cy}Q${cx+8*scale},${cy+25*scale} ${cx},${cy+29*scale}Q${cx-8*scale},${cy+25*scale} ${cx-12*scale},${cy}Z" fill="${profile.hair}" opacity=".8"/>`;
  return '';
}
function weapon(profile, cx, cy, scale = 1) {
  if (profile.weapon === 'fan') return `<g class="c2art-weapon"><path d="M${cx},${cy}Q${cx+13*scale},${cy-42*scale} ${cx+43*scale},${cy-25*scale}Q${cx+32*scale},${cy+5*scale} ${cx},${cy}Z" fill="#e8dcc2" stroke="${profile.trim}"/><path d="M${cx+5*scale},${cy-2*scale}L${cx+37*scale},${cy-23*scale}M${cx+10*scale},${cy}L${cx+30*scale},${cy-34*scale}" stroke="${profile.sub}"/></g>`;
  if (profile.weapon === 'shield') return `<path class="c2art-weapon" d="M${cx},${cy-31*scale}Q${cx+31*scale},${cy-28*scale} ${cx+28*scale},${cy+8*scale}Q${cx+18*scale},${cy+27*scale} ${cx+4*scale},${cy+33*scale}Q${cx-10*scale},${cy+21*scale} ${cx-13*scale},${cy-10*scale}Q${cx-10*scale},${cy-29*scale} ${cx},${cy-31*scale}Z" fill="${profile.main}" stroke="${profile.trim}" stroke-width="3"/>`;
  if (profile.weapon === 'bow') return `<g class="c2art-weapon"><path d="M${cx+28*scale},${cy-50*scale}Q${cx-5*scale},${cy-18*scale} ${cx+28*scale},${cy+20*scale}M${cx+28*scale},${cy-50*scale}V${cy+20*scale}" fill="none" stroke="${profile.trim}" stroke-width="4"/><path d="M${cx+12*scale},${cy-15*scale}H${cx+51*scale}" stroke="${profile.sub}" stroke-width="3"/></g>`;
  const top = profile.weapon === 'halberd' ? `<path d="M${cx+38*scale},${cy-69*scale}Q${cx+59*scale},${cy-72*scale} ${cx+52*scale},${cy-49*scale}Q${cx+39*scale},${cy-45*scale} ${cx+34*scale},${cy-56*scale}Z" fill="${profile.sub}" stroke="${profile.trim}"/>` : profile.weapon === 'blade' ? `<path d="M${cx+38*scale},${cy-69*scale}Q${cx+54*scale},${cy-64*scale} ${cx+44*scale},${cy-49*scale}L${cx+33*scale},${cy-56*scale}Z" fill="${profile.sub}" stroke="${profile.trim}"/>` : `<path d="M${cx+38*scale},${cy-69*scale}l${11*scale},${12*scale}-${14*scale},${2*scale}Z" fill="${profile.sub}" stroke="${profile.trim}"/>`;
  return `<g class="c2art-weapon"><path d="M${cx-5*scale},${cy+12*scale}L${cx+38*scale},${cy-69*scale}" stroke="${profile.trim}" stroke-width="4"/>${top}</g>`;
}
function horse(profile, cx, cy, scale = 1) {
  if (!profile.horse) return '';
  return `<g class="c2art-horse"><ellipse cx="${cx}" cy="${cy}" rx="${34*scale}" ry="${19*scale}" fill="${profile.horse}" stroke="#151313" stroke-width="2"/><path d="M${cx+24*scale},${cy-12*scale}Q${cx+42*scale},${cy-31*scale} ${cx+49*scale},${cy-18*scale}L${cx+45*scale},${cy+5*scale}Q${cx+32*scale},${cy+5*scale} ${cx+25*scale},${cy-5*scale}Z" fill="${profile.horse}" stroke="#151313" stroke-width="2"/><path class="c2art-tail" d="M${cx-30*scale},${cy-3*scale}Q${cx-53*scale},${cy-18*scale} ${cx-54*scale},${cy+4*scale}" fill="none" stroke="#171515" stroke-width="7"/></g>`;
}
function portrait(profile) {
  const bg = gid('c2bg', profile.id);
  return `<defs><linearGradient id="${bg}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0c1110"/><stop offset=".55" stop-color="${profile.main}"/><stop offset="1" stop-color="#080909"/></linearGradient></defs><rect width="180" height="220" rx="13" fill="url(#${bg})"/><circle cx="143" cy="42" r="55" fill="${profile.trim}" opacity=".13"/><text x="144" y="64" text-anchor="middle" font-size="58" font-family="serif" font-weight="900" fill="${profile.trim}" opacity=".18">${profile.emblem}</text><g class="c2art-body"><path d="M24 220Q28 151 59 137Q90 124 121 137Q154 153 158 220Z" fill="${profile.main}" stroke="${profile.trim}"/><path d="M40 159Q90 139 140 159L128 220H52Z" fill="${profile.sub}" opacity=".88"/><path d="M55 164H125M51 181H129M48 198H132" stroke="${profile.trim}" stroke-width="3" opacity=".64"/><path d="M62 71Q62 38 90 34Q119 38 119 71Q108 53 90 53Q73 53 62 71Z" fill="${profile.hair}"/><path d="M63 61Q60 100 73 123Q90 143 107 123Q120 100 117 61Q106 49 90 49Q74 49 63 61Z" fill="${profile.face}" stroke="#643c31"/>${head(profile,90,45,1)}<path d="M69 79Q77 73 84 79M96 79Q104 73 112 79" fill="none" stroke="#34231e" stroke-width="3" stroke-linecap="round"/><circle cx="77" cy="80" r="2" fill="#251a17"/><circle cx="103" cy="80" r="2" fill="#251a17"/><path d="M87 91Q84 104 91 107M78 116Q90 121 102 116" fill="none" stroke="#73483a" stroke-width="2"/>${beard(profile,90,118,1)}${weapon(profile,121,180,.86)}</g><g><rect x="11" y="171" width="71" height="38" rx="7" fill="rgba(5,8,7,.8)" stroke="${profile.trim}"/><text x="21" y="187" font-size="8" fill="${profile.trim}">${profile.emblem} · CHAPTER II</text><text x="21" y="203" font-size="17" font-weight="900" fill="#fff0d5">${esc(Object.keys(PROFILES).find((name) => PROFILES[name] === profile))}</text></g>`;
}
function unit(profile) {
  const mounted = Boolean(profile.horse); const cx = mounted ? 57 : 60; const bodyWidth = profile.body === 'massive' ? 30 : profile.body === 'wide' ? 26 : profile.body === 'tall' ? 23 : profile.body === 'slim' ? 18 : 21; const base = mounted ? 63 : 72;
  return `<ellipse cx="60" cy="128" rx="40" ry="8" fill="rgba(0,0,0,.38)"/><circle class="c2art-aura" cx="60" cy="69" r="48" fill="${profile.trim}" opacity="0"/>${horse(profile,58,99,1)}<g class="c2art-unit-body"><path class="c2art-cape" d="M${cx-bodyWidth-8},${base+2}Q${cx},${base-20} ${cx+bodyWidth+8},${base+2}L${cx+25},${base+52}H${cx-25}Z" fill="${profile.main}" opacity=".86"/><path d="M${cx-bodyWidth},${base}Q${cx-bodyWidth-8},${base+19} ${cx-16},${base+50}H${cx+16}Q${cx+bodyWidth+8},${base+19} ${cx+bodyWidth},${base}L${cx+8},${base-11}H${cx-8}Z" fill="${profile.sub}" stroke="${profile.trim}" stroke-width="2"/><path d="M${cx-bodyWidth+2},${base+9}Q${cx-bodyWidth-9},${base+28} ${cx-bodyWidth},${base+45}M${cx+bodyWidth-2},${base+9}Q${cx+bodyWidth+10},${base+28} ${cx+bodyWidth+2},${base+45}" fill="none" stroke="${profile.main}" stroke-width="7"/><path d="M${cx-14},${base-28}Q${cx-16},${base-5} ${cx-8},${base+8}Q${cx},${base+17} ${cx+8},${base+8}Q${cx+16},${base-5} ${cx+14},${base-28}Q${cx},${base-37} ${cx-14},${base-28}Z" fill="${profile.face}" stroke="#60372f"/><path d="M${cx-15},${base-30}Q${cx},${base-44} ${cx+15},${base-30}Q${cx+8},${base-40} ${cx},${base-39}Q${cx-8},${base-40} ${cx-15},${base-30}Z" fill="${profile.hair}"/>${head(profile,cx,base-39,.52)}<path d="M${cx-9},${base-19}Q${cx-5},${base-22} ${cx-1},${base-19}M${cx+1},${base-19}Q${cx+5},${base-22} ${cx+9},${base-19}" fill="none" stroke="#33221f" stroke-width="2"/>${beard(profile,cx,base-6,.55)}${weapon(profile,cx+bodyWidth-2,base+44,.72)}</g>`;
}
function profileFromSvg(svg) {
  const label = (svg.getAttribute('aria-label') || '').trim();
  return NAME_TO_PROFILE.get(label) || [...NAME_TO_PROFILE.entries()].find(([name]) => label.includes(name))?.[1] || null;
}
function render(svg, profile) {
  const isUnit = Boolean(svg.closest('.battle-unit')) || /\b(unit|micro|tiny)\b/.test(svg.getAttribute('class') || '');
  svg.dataset.chapterTwoArt = '1'; svg.dataset.chapterTwoHero = profile.id; svg.dataset.state ||= 'idle';
  svg.classList.add('chapter-two-art-v1', isUnit ? 'c2art-unit' : 'c2art-portrait');
  svg.setAttribute('viewBox', isUnit ? '0 0 120 140' : '0 0 180 220');
  svg.innerHTML = isUnit ? unit(profile) : portrait(profile);
}
function enhance() {
  queued = false;
  document.documentElement.classList.add('chapter-two-art-v1-ready');
  document.querySelectorAll('svg.hero-portrait:not([data-chapter-two-art])').forEach((svg) => { const profile = profileFromSvg(svg); if (profile) render(svg, profile); });
  window.__chapterTwoArtV1 = { ready: true, version: VERSION, profiles: Object.values(PROFILES).map((profile) => profile.id), profileCount: Object.keys(PROFILES).length };
}
function schedule() { if (queued) return; queued = true; requestAnimationFrame(enhance); }
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
schedule();
