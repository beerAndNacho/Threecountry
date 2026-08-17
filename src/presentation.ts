type CharacterProfile = {
  name: string;
  hanja: string;
  primary: string;
  secondary: string;
  skin: string;
  hair: string;
  eye: string;
  headgear: 'crown' | 'band' | 'helm' | 'hood';
  beard: 'none' | 'short' | 'long' | 'wide';
  weapon: 'sword' | 'spear' | 'shield' | 'scroll' | 'fan' | 'club';
  emblem: string;
  epithet: string;
};

const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  조조: { name: '조조', hanja: '曹', primary: '#242a2a', secondary: '#a94737', skin: '#e8b58d', hair: '#151817', eye: '#322823', headgear: 'crown', beard: 'short', weapon: 'sword', emblem: '魏', epithet: '기회를 놓치지 않는 군주' },
  하후돈: { name: '하후돈', hanja: '夏', primary: '#273d4b', secondary: '#b49352', skin: '#dba57f', hair: '#171817', eye: '#2e2723', headgear: 'helm', beard: 'short', weapon: 'shield', emblem: '盾', epithet: '무너지지 않는 중앙' },
  전위: { name: '전위', hanja: '典', primary: '#4a302b', secondary: '#b95a3f', skin: '#c99068', hair: '#211b18', eye: '#2d211d', headgear: 'band', beard: 'wide', weapon: 'club', emblem: '護', epithet: '문전의 수호자' },
  순욱: { name: '순욱', hanja: '荀', primary: '#52736b', secondary: '#d7c08b', skin: '#e7b993', hair: '#2c2925', eye: '#3a3029', headgear: 'crown', beard: 'none', weapon: 'scroll', emblem: '政', epithet: '왕좌를 설계하는 문관' },
  곽가: { name: '곽가', hanja: '郭', primary: '#5b526d', secondary: '#c6a5c8', skin: '#e0ad87', hair: '#211f22', eye: '#382e34', headgear: 'hood', beard: 'none', weapon: 'fan', emblem: '策', epithet: '한발 앞선 판단' },
  허저: { name: '허저', hanja: '許', primary: '#363c36', secondary: '#b49352', skin: '#c98d63', hair: '#1d1c19', eye: '#2c231e', headgear: 'helm', beard: 'wide', weapon: 'shield', emblem: '壁', epithet: '중군을 지키는 방패' },
  유비: { name: '유비', hanja: '劉', primary: '#315f52', secondary: '#d7b56d', skin: '#e6b18a', hair: '#28231e', eye: '#342a24', headgear: 'crown', beard: 'short', weapon: 'sword', emblem: '蜀', epithet: '사람을 얻는 군주' },
  관우: { name: '관우', hanja: '關', primary: '#244f45', secondary: '#a94737', skin: '#bd775d', hair: '#1b1b18', eye: '#2a1e1a', headgear: 'band', beard: 'long', weapon: 'spear', emblem: '義', epithet: '의기의 선봉' },
  장비: { name: '장비', hanja: '張', primary: '#5a2c2b', secondary: '#d28b42', skin: '#a9654b', hair: '#161414', eye: '#241917', headgear: 'band', beard: 'wide', weapon: 'spear', emblem: '雷', epithet: '벽력 같은 돌파' },
  조운: { name: '조운', hanja: '趙', primary: '#627a83', secondary: '#e6e3d7', skin: '#e1ad86', hair: '#242526', eye: '#302b28', headgear: 'helm', beard: 'none', weapon: 'spear', emblem: '救', epithet: '천리를 달리는 구원자' },
  서서: { name: '서서', hanja: '徐', primary: '#4a6268', secondary: '#b79a70', skin: '#dfae89', hair: '#242424', eye: '#362d29', headgear: 'hood', beard: 'short', weapon: 'scroll', emblem: '解', epithet: '전장의 해답을 찾는 책사' },
  미축: { name: '미축', hanja: '糜', primary: '#6d5845', secondary: '#6b9181', skin: '#e0b18d', hair: '#302921', eye: '#3b3029', headgear: 'crown', beard: 'none', weapon: 'scroll', emblem: '商', epithet: '군량과 길을 잇는 상인' },
};

const FACTION_LINEUPS: Record<'cao' | 'liu', string[]> = {
  cao: ['조조', '하후돈', '전위'],
  liu: ['유비', '관우', '장비'],
};

let scheduled = false;
let pendingRecruitName = '';
let pendingBattleNames: string[] = [];
let openingRequested = false;
let toastSignature = '';
let battleTimer = 0;

function safeSessionGet(key: string): string {
  try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; }
}

function safeSessionSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch {}
}

function escapeMarkup(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] ?? character));
}

function weaponSvg(profile: CharacterProfile): string {
  const stroke = profile.secondary;
  if (profile.weapon === 'spear') {
    return `<g class="portrait-weapon spear"><path d="M84 14 L47 103"/><path d="M82 13 l7 10 -12 -2z" fill="${stroke}"/><path d="M49 91 l8 8"/></g>`;
  }
  if (profile.weapon === 'sword') {
    return `<g class="portrait-weapon sword"><path d="M82 20 L53 95"/><path d="M78 18 l9 5 -8 6z" fill="${stroke}"/><path d="M47 82 l15 6"/></g>`;
  }
  if (profile.weapon === 'shield') {
    return `<g class="portrait-shield"><path d="M69 66 Q91 68 88 93 Q82 108 70 113 Q57 106 52 91 Q51 72 69 66Z" fill="${profile.primary}" stroke="${stroke}"/><path d="M69 72v31M58 87h22"/></g>`;
  }
  if (profile.weapon === 'scroll') {
    return `<g class="portrait-scroll"><path d="M54 86 q15 -6 29 0 v20 q-14 -5 -29 0z" fill="#efe0bd"/><path d="M59 91h18M59 96h15M59 101h11"/></g>`;
  }
  if (profile.weapon === 'fan') {
    return `<g class="portrait-fan"><path d="M54 104 Q65 69 85 88 Q77 105 54 104Z" fill="#e6dcc3" stroke="${stroke}"/><path d="M58 101l23 -11M61 101l16 -18M66 102l7 -21"/></g>`;
  }
  return `<g class="portrait-weapon club"><path d="M81 25 L54 103"/><path d="M78 19 q12 3 8 16 q-13 4 -15 -7z" fill="${stroke}"/></g>`;
}

function headgearSvg(profile: CharacterProfile): string {
  const accent = profile.secondary;
  if (profile.headgear === 'crown') {
    return `<g class="portrait-headgear"><path d="M36 37 Q50 18 64 37 L60 48 H40Z" fill="${profile.primary}" stroke="${accent}"/><path d="M40 33h20M50 19v19"/><circle cx="50" cy="26" r="3" fill="${accent}"/></g>`;
  }
  if (profile.headgear === 'helm') {
    return `<g class="portrait-headgear"><path d="M30 45 Q31 20 50 17 Q70 21 72 45 L64 52 H36Z" fill="${profile.primary}" stroke="${accent}"/><path d="M50 16v-9M46 9h8"/><path d="M31 40h40"/></g>`;
  }
  if (profile.headgear === 'hood') {
    return `<g class="portrait-headgear"><path d="M28 52 Q27 18 50 14 Q74 20 74 52 L64 46 Q61 27 50 25 Q38 27 35 47Z" fill="${profile.primary}" stroke="${accent}"/></g>`;
  }
  return `<g class="portrait-headgear"><path d="M31 39 Q50 28 69 39 L66 47 Q50 39 34 47Z" fill="${accent}"/><path d="M32 41h36"/></g>`;
}

function beardSvg(profile: CharacterProfile): string {
  if (profile.beard === 'none') return '';
  if (profile.beard === 'short') return `<path class="portrait-beard" d="M40 65 Q50 76 60 65 Q58 82 50 84 Q42 81 40 65Z" fill="${profile.hair}"/>`;
  if (profile.beard === 'long') return `<path class="portrait-beard" d="M36 63 Q50 77 64 63 Q62 93 54 112 L48 119 L42 108 Q37 89 36 63Z" fill="${profile.hair}"/><path d="M46 78l4 32 5 -32" stroke="rgba(255,255,255,.18)"/>`;
  return `<path class="portrait-beard" d="M30 61 Q50 78 70 61 Q68 84 61 92 Q53 86 50 98 Q46 86 38 92 Q31 82 30 61Z" fill="${profile.hair}"/>`;
}

function characterSvg(profile: CharacterProfile, compact = false): string {
  const label = escapeMarkup(profile.name);
  const viewBox = compact ? '0 0 100 112' : '0 0 100 124';
  return `<svg class="character-svg" viewBox="${viewBox}" role="img" aria-label="${label} 캐릭터">
    <defs>
      <radialGradient id="halo-${profile.hanja}" cx="50%" cy="38%" r="58%"><stop offset="0" stop-color="${profile.secondary}" stop-opacity=".42"/><stop offset="1" stop-color="${profile.primary}" stop-opacity="0"/></radialGradient>
      <linearGradient id="robe-${profile.hanja}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${profile.primary}"/><stop offset="1" stop-color="${profile.secondary}"/></linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#halo-${profile.hanja})"/>
    <path class="portrait-cape" d="M8 124 Q13 86 34 78 Q50 69 66 78 Q88 87 93 124Z" fill="${profile.primary}" opacity=".8"/>
    ${weaponSvg(profile)}
    <path class="portrait-robe" d="M20 124 Q20 84 40 77 L50 87 L60 77 Q80 84 81 124Z" fill="url(#robe-${profile.hanja})" stroke="rgba(255,255,255,.2)"/>
    <path d="M42 79 L50 88 L58 79 L63 124 H37Z" fill="rgba(255,255,255,.12)"/>
    <ellipse cx="50" cy="50" rx="21" ry="25" fill="${profile.skin}"/>
    <path d="M31 45 Q32 24 50 23 Q69 24 70 45 Q62 34 50 34 Q38 34 31 45Z" fill="${profile.hair}"/>
    ${headgearSvg(profile)}
    <path d="M38 52 q5 -4 10 0M52 52q5 -4 10 0" fill="none" stroke="${profile.eye}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="43" cy="53" r="1.5" fill="${profile.eye}"/><circle cx="57" cy="53" r="1.5" fill="${profile.eye}"/>
    <path d="M47 62 Q50 64 53 62" fill="none" stroke="rgba(70,40,30,.45)" stroke-linecap="round"/>
    <path d="M44 68 Q50 72 56 68" fill="none" stroke="${profile.eye}" stroke-width="1.6" stroke-linecap="round"/>
    ${beardSvg(profile)}
    <circle cx="22" cy="102" r="13" fill="${profile.secondary}" stroke="rgba(255,255,255,.5)"/><text x="22" y="107" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">${profile.emblem}</text>
  </svg>`;
}

function nameFromPortrait(portrait: HTMLElement): string {
  const contexts = [
    portrait.closest('.officer-card')?.querySelector('h3'),
    portrait.closest('.lord-card')?.querySelector('h3'),
    portrait.closest('.title-lord')?.querySelector('b'),
    portrait.closest('.officer-chip')?.querySelector('b'),
    portrait.closest('.line-officer')?.querySelector('select option:checked'),
    portrait.parentElement?.querySelector('h3'),
  ];
  for (const context of contexts) {
    const text = context?.textContent?.trim() ?? '';
    const match = Object.keys(CHARACTER_PROFILES).find((name) => text.includes(name));
    if (match) return match;
  }
  return '';
}

function enhancePortraits(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.officer-portrait:not([data-visual-v2])').forEach((portrait) => {
    const name = nameFromPortrait(portrait);
    const profile = CHARACTER_PROFILES[name];
    if (!profile) return;
    portrait.dataset.visualV2 = 'true';
    portrait.dataset.character = name;
    portrait.innerHTML = characterSvg(profile, portrait.classList.contains('small'));
    portrait.title = `${profile.name} · ${profile.epithet}`;
  });
}

function selectedFactionFromDom(): 'cao' | 'liu' {
  const selected = document.querySelector<HTMLElement>('.lord-card.selected h3')?.textContent ?? '';
  if (selected.includes('유비')) return 'liu';
  const crest = document.querySelector<HTMLElement>('.campaign-brand > span')?.textContent ?? '';
  return crest.includes('劉') ? 'liu' : 'cao';
}

function heroCard(name: string, side: 'left' | 'right'): string {
  const profile = CHARACTER_PROFILES[name];
  if (!profile) return '';
  return `<article class="cinematic-hero ${side}" style="--hero:${profile.primary};--hero-accent:${profile.secondary}">
    <div class="cinematic-art">${characterSvg(profile)}</div><div class="cinematic-hero-copy"><small>${profile.hanja}</small><b>${profile.name}</b><span>${profile.epithet}</span></div>
  </article>`;
}

function enhanceTitle(): void {
  const title = document.querySelector<HTMLElement>('.title-screen:not([data-cinematic-v2])');
  if (!title) return;
  title.dataset.cinematicV2 = 'true';
  const faction = selectedFactionFromDom();
  const lordName = faction === 'cao' ? '조조' : '유비';
  const rivalName = faction === 'cao' ? '유비' : '조조';
  const main = title.querySelector<HTMLElement>('.title-main');
  if (main) {
    main.insertAdjacentHTML('afterbegin', `<div class="cinematic-prologue"><span>公元 190 · 中原</span><b>첫 깃발이 오르는 봄</b><i></i></div>`);
  }
  const diorama = title.querySelector<HTMLElement>('.title-diorama');
  if (diorama) {
    diorama.insertAdjacentHTML('afterbegin', `<div class="title-cinematic-cast">${heroCard(lordName, 'left')}<div class="ink-versus"><i></i><b>戰</b><i></i></div>${heroCard(rivalName, 'right')}</div><div class="wind-petals">${'<i></i>'.repeat(9)}</div>`);
  }
  const selectedCard = title.querySelector<HTMLElement>('.lord-card.selected');
  if (selectedCard) selectedCard.insertAdjacentHTML('beforeend', `<div class="lord-skill-ribbon"><span>군주 기술</span><b>${faction === 'cao' ? '기회 포착 · 행동 유연성' : '인의의 깃발 · 사기 회복'}</b></div>`);
}

function enhanceMap(): void {
  const map = document.querySelector<HTMLElement>('.map-view:not([data-battlefield-v2])');
  if (!map) return;
  map.dataset.battlefieldV2 = 'true';
  const faction = selectedFactionFromDom();
  const lord = faction === 'cao' ? '조조' : '유비';
  const coach = map.querySelector<HTMLElement>('.coach-strip');
  if (coach) {
    coach.insertAdjacentHTML('afterbegin', `<div class="coach-character">${characterSvg(CHARACTER_PROFILES[lord], true)}</div>`);
  }
  const canvas = map.querySelector<HTMLElement>('.map-canvas');
  if (canvas) {
    canvas.insertAdjacentHTML('beforeend', `<div class="map-weather"><i></i><i></i><i></i></div><div class="marching-army army-a" aria-hidden="true"><span>${faction === 'cao' ? '曹' : '劉'}</span><i>騎</i><b></b></div><div class="marching-army army-b" aria-hidden="true"><span>野</span><i>步</i><b></b></div><div class="battlefront-label"><small>FRONT LINE</small><b>진류 쟁탈전</b></div>`);
  }
  const layout = map.querySelector<HTMLElement>('.map-layout');
  if (layout) {
    const targetButton = layout.querySelector<HTMLElement>('.hostile-panel button[data-action="open-battle"]');
    if (targetButton) {
      const source = targetButton.dataset.source ?? '';
      const target = targetButton.dataset.target ?? '';
      layout.insertAdjacentHTML('afterend', `<button class="floating-war-command" data-action="open-battle" data-source="${source}" data-target="${target}" type="button"><span>⚔</span><div><small>전투 가능</small><b>즉시 출전 회의 열기</b></div><i>→</i></button>`);
    }
  }
  map.insertAdjacentHTML('afterbegin', `<section class="season-mission"><div><small>SEASON MISSION</small><b>진류의 깃발을 확보하라</b></div><ol><li class="done"><i>1</i>도시를 정비</li><li><i>2</i>장수 3명 편성</li><li><i>3</i>진류 승리</li></ol><span class="mission-reward"><small>승리 기록</small><b>첫 중원 전공</b></span></section>`);
}

function enhanceCourt(): void {
  const court = document.querySelector<HTMLElement>('.court-view:not([data-character-v2])');
  if (!court) return;
  court.dataset.characterV2 = 'true';
  court.querySelectorAll<HTMLElement>('.officer-card').forEach((card) => {
    const name = Object.keys(CHARACTER_PROFILES).find((candidate) => card.textContent?.includes(candidate));
    const profile = name ? CHARACTER_PROFILES[name] : undefined;
    if (!profile) return;
    card.style.setProperty('--character-primary', profile.primary);
    card.style.setProperty('--character-accent', profile.secondary);
    card.insertAdjacentHTML('afterbegin', `<span class="character-rarity">名將</span>`);
  });
}

function captureBattleLineup(button: HTMLElement): void {
  if (button.dataset.action !== 'confirm-battle') return;
  pendingBattleNames = Array.from(document.querySelectorAll<HTMLSelectElement>('.line-officer select'))
    .map((select) => select.selectedOptions[0]?.textContent?.split('·')[0]?.trim() ?? '')
    .filter((name) => Boolean(CHARACTER_PROFILES[name]));
  document.body.classList.add('battle-launching');
  window.setTimeout(() => document.body.classList.remove('battle-launching'), 850);
}

function finishBattleCinema(report: HTMLElement): void {
  window.clearTimeout(battleTimer);
  report.classList.remove('cinematic-playing');
  report.querySelector<HTMLElement>('.battle-cinema')?.classList.add('finished');
}

function enhanceBattleReport(): void {
  const report = document.querySelector<HTMLElement>('.battle-report:not([data-cinematic-v2])');
  if (!report) return;
  report.dataset.cinematicV2 = 'true';
  const playerFaction = selectedFactionFromDom();
  const enemyFaction: 'cao' | 'liu' = playerFaction === 'cao' ? 'liu' : 'cao';
  const friendly = pendingBattleNames.length >= 3 ? pendingBattleNames.slice(0, 3) : FACTION_LINEUPS[playerFaction];
  const enemy = FACTION_LINEUPS[enemyFaction];
  const resultBanner = report.querySelector<HTMLElement>('.report-banner');
  const victory = resultBanner?.classList.contains('victory') ?? false;
  const headline = resultBanner?.querySelector('h2')?.textContent?.trim() ?? (victory ? '승리' : '퇴각');
  const logs = Array.from(report.querySelectorAll<HTMLElement>('.battle-log p')).slice(0, 6).map((log) => log.textContent?.trim() ?? '');
  const cinema = `<section class="battle-cinema ${victory ? 'won' : 'lost'}">
    <div class="battle-sky"><i></i><i></i><i></i></div>
    <header><small>BATTLE OF THE CENTRAL PLAINS</small><b>${escapeMarkup(headline)}</b><button data-cinema-skip type="button">연출 건너뛰기</button></header>
    <div class="cinema-armies"><div class="army-side friendly">${friendly.map((name, index) => `<div class="lane-fighter f${index + 1}">${characterSvg(CHARACTER_PROFILES[name], true)}<span>${escapeMarkup(name)}</span><i>${['左', '中', '右'][index]}</i></div>`).join('')}</div><div class="cinema-clash"><b>⚔</b><span></span></div><div class="army-side enemy">${enemy.map((name, index) => `<div class="lane-fighter e${index + 1}">${characterSvg(CHARACTER_PROFILES[name], true)}<span>${escapeMarkup(name)}</span><i>${['左', '中', '右'][index]}</i></div>`).join('')}</div></div>
    <div class="cinema-log">${logs.map((log, index) => `<p style="--delay:${index * 0.46}s"><i>${index + 1}</i><span>${escapeMarkup(log)}</span></p>`).join('')}</div>
    <div class="cinema-result"><span>${victory ? '勝利' : '退却'}</span><b>${victory ? '적의 깃발이 흔들립니다' : '대열을 정비해 다시 도전하십시오'}</b></div>
  </section>`;
  report.insertAdjacentHTML('afterbegin', cinema);
  report.classList.add('cinematic-playing');
  report.querySelector<HTMLButtonElement>('[data-cinema-skip]')?.addEventListener('click', () => finishBattleCinema(report));
  battleTimer = window.setTimeout(() => finishBattleCinema(report), 5200);
  pendingBattleNames = [];
}

function showOpeningScene(): void {
  if (!openingRequested && safeSessionGet('threecountry:opening-v2') === 'seen') return;
  const campaign = document.querySelector<HTMLElement>('.campaign-app');
  if (!campaign || document.querySelector('.opening-cinematic')) return;
  openingRequested = false;
  safeSessionSet('threecountry:opening-v2', 'seen');
  const faction = selectedFactionFromDom();
  const lordName = faction === 'cao' ? '조조' : '유비';
  const companion = faction === 'cao' ? '곽가' : '서서';
  campaign.insertAdjacentHTML('beforeend', `<div class="opening-cinematic"><div class="opening-backdrop"><i></i><i></i><i></i></div><section><div class="opening-year"><small>公元 190</small><b>중원의 봄</b></div><div class="opening-cast">${heroCard(lordName, 'left')}${heroCard(companion, 'right')}</div><div class="opening-copy"><span>PROLOGUE</span><h2>진류의 빈 깃발을 먼저 차지하라</h2><p>${faction === 'cao' ? '허창의 병력은 충분하지 않다. 그러나 진류를 얻으면 낙양으로 향하는 길과 인재가 열린다.' : '낙양의 군세는 강하다. 진류의 백성과 병력을 얻어 허창으로 나아갈 기반을 마련해야 한다.'}</p><blockquote>“${CHARACTER_PROFILES[lordName].name === '조조' ? '완벽한 때를 기다리지 않겠다. 먼저 움직여 때를 만들겠다.' : '성 하나보다 그 안의 사람을 먼저 얻겠소.'}”</blockquote><button data-opening-close type="button">전장을 살핀다 <b>→</b></button></div></section></div>`);
  document.querySelector<HTMLButtonElement>('[data-opening-close]')?.addEventListener('click', () => {
    document.querySelector<HTMLElement>('.opening-cinematic')?.classList.add('closing');
    window.setTimeout(() => document.querySelector<HTMLElement>('.opening-cinematic')?.remove(), 420);
  });
}

function showRecruitReveal(name: string): void {
  const profile = CHARACTER_PROFILES[name];
  if (!profile || document.querySelector('.recruit-reveal')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="recruit-reveal" style="--recruit:${profile.primary};--recruit-accent:${profile.secondary}"><div class="recruit-rays"></div><section><small>NEW OFFICER</small><div>${characterSvg(profile)}</div><span>${profile.hanja}</span><h2>${profile.name}</h2><p>${profile.epithet}</p><b>당신의 깃발 아래 합류했습니다</b></section></div>`);
  window.setTimeout(() => document.querySelector<HTMLElement>('.recruit-reveal')?.classList.add('show'), 20);
  window.setTimeout(() => {
    const reveal = document.querySelector<HTMLElement>('.recruit-reveal');
    reveal?.classList.remove('show');
    window.setTimeout(() => reveal?.remove(), 360);
  }, 2600);
}

function inspectToast(): void {
  const toast = document.querySelector<HTMLElement>('#toast.show');
  if (!toast) return;
  const signature = `${toast.dataset.tone}:${toast.textContent}`;
  if (signature === toastSignature) return;
  toastSignature = signature;
  if (pendingRecruitName && toast.dataset.tone === 'good') {
    showRecruitReveal(pendingRecruitName);
    pendingRecruitName = '';
  } else if (pendingRecruitName && toast.dataset.tone === 'bad') {
    pendingRecruitName = '';
  }
}

function enhanceEnding(): void {
  const ending = document.querySelector<HTMLElement>('.ending-modal:not([data-ending-v2])');
  if (!ending) return;
  ending.dataset.endingV2 = 'true';
  const faction = selectedFactionFromDom();
  const lord = faction === 'cao' ? '조조' : '유비';
  ending.insertAdjacentHTML('afterbegin', `<div class="ending-hero">${characterSvg(CHARACTER_PROFILES[lord])}<div class="ending-confetti">${'<i></i>'.repeat(12)}</div></div>`);
}

function enhanceAll(): void {
  scheduled = false;
  document.documentElement.classList.add('threecountry-v2');
  enhancePortraits();
  enhanceTitle();
  enhanceMap();
  enhanceCourt();
  enhanceBattleReport();
  enhanceEnding();
  inspectToast();
  if (openingRequested || (document.querySelector('.campaign-app') && safeSessionGet('threecountry:opening-v2') !== 'seen')) showOpeningScene();
}

function scheduleEnhance(): void {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(enhanceAll);
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const action = target.closest<HTMLElement>('[data-action]');
  if (!action) return;
  if (action.dataset.action === 'start-game') {
    openingRequested = true;
    safeSessionSet('threecountry:opening-v2', '');
  }
  if (action.dataset.action === 'recruit-officer') {
    const card = action.closest<HTMLElement>('.candidate-card, article');
    pendingRecruitName = Object.keys(CHARACTER_PROFILES).find((name) => card?.textContent?.includes(name)) ?? '';
  }
  captureBattleLineup(action);
}, true);

const observer = new MutationObserver(scheduleEnhance);
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'data-tone'] });

window.addEventListener('resize', scheduleEnhance, { passive: true });
scheduleEnhance();
