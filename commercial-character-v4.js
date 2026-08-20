export const CHARACTER_ART_VERSION = '1.4.0';

export const HERO_LORE = {
  cao: {
    name: '조조', courtesy: '맹덕', age: 35, origin: '패국 초현', height: '172cm',
    build: '마른 근육형', temperament: '냉정 · 결단', voice: '낮고 빠른 단문',
    weapon: '의천계 단검', armor: '먹빛 지휘 찰갑', mark: '왼쪽 눈가의 얕은 주름',
    doctrine: '적의 선택지를 줄인 뒤 빈틈을 강제로 만든다.',
    relations: ['하후돈 · 창업 동지', '곽가 · 위험한 신뢰', '유비 · 경계와 인정'],
    colors: ['#151a20', '#7f2e35', '#d5aa55'], face: 'sharp', body: 'lean',
    head: 'commander', beard: 'short', weaponShape: 'sword', emblem: '魏', expression: 'narrow', ageTone: 2,
  },
  xiahou: {
    name: '하후돈', courtesy: '원양', age: 34, origin: '패국 초현', height: '187cm',
    build: '장신 중갑형', temperament: '완고 · 충직', voice: '굵고 끊어지는 어조',
    weapon: '장병 철창', armor: '청철 중찰갑', mark: '오른눈 보호대와 깊은 흉터',
    doctrine: '중앙을 고정하고 아군이 움직일 시간을 번다.',
    relations: ['조조 · 목숨을 건 충성', '전위 · 방벽의 경쟁', '관우 · 무인의 경계'],
    colors: ['#253c52', '#416e8d', '#d0a45d'], face: 'square', body: 'tall',
    head: 'heavy', beard: 'short', weaponShape: 'spear', emblem: '守', expression: 'stern', ageTone: 3, eyepatch: true,
  },
  dian: {
    name: '전위', courtesy: '악래', age: 32, origin: '진류 기오', height: '192cm',
    build: '거구 근육형', temperament: '과묵 · 수호', voice: '짧고 무거운 저음',
    weapon: '쌍철극', armor: '흑갈 철편갑', mark: '광대뼈의 오래된 자상',
    doctrine: '군주에게 향하는 공격을 몸으로 끊는다.',
    relations: ['조조 · 절대 호위', '허저 · 힘의 동료', '장비 · 충돌을 즐기는 호적수'],
    colors: ['#3a2925', '#8f4a32', '#d0a25d'], face: 'square', body: 'massive',
    head: 'band', beard: 'wide', weaponShape: 'halberd', emblem: '護', expression: 'wide', ageTone: 2, scar: true,
  },
  xun: {
    name: '순욱', courtesy: '문약', age: 27, origin: '영천 영음', height: '178cm',
    build: '가늘고 반듯한 체형', temperament: '절제 · 원칙', voice: '차분하고 긴 문장',
    weapon: '죽간과 지휘홀', armor: '백회색 군사 장포', mark: '항상 정돈된 관과 옷깃',
    doctrine: '승리 이후 유지될 질서까지 계산한다.',
    relations: ['조조 · 명분을 둘러싼 협력', '곽가 · 방법론의 대조', '유비 · 인덕에 대한 관찰'],
    colors: ['#d5d2c9', '#456c7c', '#cfac66'], face: 'long', body: 'slim',
    head: 'scholar', beard: 'thin', weaponShape: 'scroll', emblem: '政', expression: 'calm', ageTone: 1,
  },
  guo: {
    name: '곽가', courtesy: '봉효', age: 26, origin: '영천 양적', height: '174cm',
    build: '마르고 병약한 체형', temperament: '대담 · 통찰', voice: '가볍지만 날카로운 어조',
    weapon: '청옥 군선', armor: '자색 후드 장포', mark: '창백한 피부와 짙은 눈 밑',
    doctrine: '승부가 결정되기 전, 상대가 생각하지 못한 수를 둔다.',
    relations: ['조조 · 가장 위험한 조언자', '순욱 · 질서와 기책의 균형', '관우 · 예측하기 어려운 의리'],
    colors: ['#30283e', '#71468f', '#caa45f'], face: 'sharp', body: 'slim',
    head: 'hood', beard: '', weaponShape: 'fan', emblem: '策', expression: 'tired', ageTone: 4, pale: true,
  },
  xu: {
    name: '허저', courtesy: '중강', age: 31, origin: '초국 초현', height: '190cm',
    build: '넓고 두꺼운 체형', temperament: '순박 · 철벽', voice: '느리고 울리는 저음',
    weapon: '대형 방패와 철퇴', armor: '녹회색 중갑', mark: '오른쪽 눈썹을 가르는 흉터',
    doctrine: '아군의 약한 고리를 몸으로 메워 전열을 유지한다.',
    relations: ['조조 · 우직한 충성', '전위 · 힘의 동료', '장비 · 정면 승부의 호적수'],
    colors: ['#38433b', '#697b62', '#c8a35f'], face: 'round', body: 'massive',
    head: 'heavy', beard: 'wide', weaponShape: 'shield', emblem: '壁', expression: 'deep', ageTone: 2, scar: true,
  },
  liu: {
    name: '유비', courtesy: '현덕', age: 29, origin: '탁군 탁현', height: '181cm',
    build: '균형 잡힌 체형', temperament: '온화 · 집념', voice: '부드럽지만 끝이 단단한 어조',
    weapon: '쌍고검', armor: '청록 지휘 갑주', mark: '웃을 때 깊어지는 눈가',
    doctrine: '부대를 살려 남기고 백성의 지지를 전력으로 바꾼다.',
    relations: ['관우 · 의형', '장비 · 의형', '조조 · 인정과 경계'],
    colors: ['#265b45', '#4f8b61', '#d4b15f'], face: 'long', body: 'balanced',
    head: 'soft', beard: 'short', weaponShape: 'dual', emblem: '蜀', expression: 'gentle', ageTone: 2,
  },
  guan: {
    name: '관우', courtesy: '운장', age: 30, origin: '하동 해현', height: '198cm',
    build: '장신 장병기형', temperament: '엄정 · 자존', voice: '낮고 길게 울리는 어조',
    weapon: '청룡계 장도', armor: '심록 비늘 갑주', mark: '붉은 안색과 길게 갈라진 수염',
    doctrine: '넓은 사거리와 위압으로 적의 중심선을 끊는다.',
    relations: ['유비 · 군신이자 의형', '장비 · 의형', '조조 · 은의와 적대'],
    colors: ['#1f5940', '#3c8052', '#d6ae55'], face: 'long', body: 'tall',
    head: 'band', beard: 'long', weaponShape: 'guandao', emblem: '義', expression: 'stern', ageTone: 3, redFace: true,
  },
  zhang: {
    name: '장비', courtesy: '익덕', age: 27, origin: '탁군', height: '188cm',
    build: '넓은 상체의 폭발형', temperament: '격정 · 솔직', voice: '거칠고 크게 터지는 어조',
    weapon: '장팔계 사모', armor: '적갈 철편 갑주', mark: '넓은 코와 거친 턱수염',
    doctrine: '첫 충격과 호통으로 적의 행동 순서를 무너뜨린다.',
    relations: ['유비 · 의형', '관우 · 의형', '전위 · 힘의 호적수'],
    colors: ['#5d2a29', '#a34737', '#d49d50'], face: 'square', body: 'massive',
    head: 'band', beard: 'wild', weaponShape: 'spear', emblem: '雷', expression: 'wide', ageTone: 2, scar: true,
  },
  zhao: {
    name: '조운', courtesy: '자룡', age: 24, origin: '상산 진정', height: '186cm',
    build: '민첩한 장신형', temperament: '침착 · 헌신', voice: '분명하고 짧은 보고체',
    weapon: '백랍 장창', armor: '은백 경량 찰갑', mark: '흠집 없이 정돈된 백색 갑주',
    doctrine: '위험한 틈을 통과해 고립된 아군의 퇴로를 연다.',
    relations: ['유비 · 신뢰받는 호위', '관우 · 존경', '하후돈 · 기동전 경쟁'],
    colors: ['#b8c5ca', '#4d758c', '#d9bd78'], face: 'sharp', body: 'athletic',
    head: 'light', beard: '', weaponShape: 'spear', emblem: '救', expression: 'focused', ageTone: 1,
  },
  'soldier-spear': {
    name: '창병대', courtesy: '', age: 25, origin: '진류 일대', height: '175cm', build: '보통 체형',
    temperament: '훈련 · 복종', voice: '구령', weapon: '보병 장창', armor: '갈색 보급 찰갑', mark: '부대 표식',
    doctrine: '인접 칸을 막아 장수의 이동로를 만든다.', relations: [], colors: ['#405941','#71804f','#b79a58'],
    face: 'round', body: 'balanced', head: 'soldier', beard: '', weaponShape: 'spear', emblem: '兵', expression: 'plain', ageTone: 1,
  },
  'soldier-archer': {
    name: '궁병대', courtesy: '', age: 24, origin: '진류 일대', height: '173cm', build: '가벼운 체형',
    temperament: '집중 · 지원', voice: '구령', weapon: '단궁', armor: '황갈 가죽갑', mark: '화살통',
    doctrine: '후열에서 적의 접근로를 억제한다.', relations: [], colors: ['#596046','#8a7145','#c0a166'],
    face: 'round', body: 'slim', head: 'band', beard: '', weaponShape: 'bow', emblem: '弓', expression: 'plain', ageTone: 1,
  },
};

const NAME_TO_ID = new Map(Object.entries(HERO_LORE).map(([id, profile]) => [profile.name, id]));
const CORE_BUSTS = new Set(['cao','xiahou','dian','guo','liu','guan','zhang','zhao']);
const ns = 'http://www.w3.org/2000/svg';
let scheduled = false;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeId = (value) => String(value).replace(/[^a-z0-9_-]/gi, '-');

function weaponMarkup(profile) {
  const trim = profile.colors[2];
  switch (profile.weaponShape) {
    case 'sword': return `<g class="ccv4-weapon sword"><path d="M254 53L203 341"/><path d="M249 40l20 18-23 12z" fill="${trim}"/><path d="M195 304l28 6"/></g>`;
    case 'dual': return `<g class="ccv4-weapon dual"><path d="M70 92l44 259M255 87l-42 266"/><path d="M65 76l18 13-19 9zM260 72l-18 14 20 8z" fill="${trim}"/></g>`;
    case 'spear': return `<g class="ccv4-weapon spear"><path d="M266 36L205 388"/><path d="M266 25l16 25-27-5z" fill="${trim}"/><path d="M260 48q22 12 29 2" stroke="${profile.colors[1]}" stroke-width="8"/></g>`;
    case 'guandao': return `<g class="ccv4-weapon guandao"><path d="M267 16L205 399"/><path d="M267 12q46 19 10 69q-16-22-39-25q23-15 29-44z" fill="${trim}"/><path d="M260 73q25 13 35 4" stroke="#912f2c" stroke-width="9"/></g>`;
    case 'halberd': return `<g class="ccv4-weapon halberd"><path d="M266 24L210 400"/><path d="M265 18l18 30-25-4zM262 42q39 7 18 33q-8-18-28-15z" fill="${trim}"/></g>`;
    case 'shield': return `<g class="ccv4-weapon shield"><path d="M230 235q66 8 49 92q-22 55-58 68q-42-21-55-69q2-76 64-91z" fill="${profile.colors[0]}" stroke="${trim}" stroke-width="7"/><path d="M222 254v116M187 309h75" stroke="${trim}" stroke-width="6"/></g>`;
    case 'fan': return `<g class="ccv4-weapon fan"><path d="M214 310q34-94 89-36q-17 58-89 36z" fill="#e5dcc7" stroke="${trim}" stroke-width="5"/><path d="M226 305l62-28M236 310l42-51M250 313l15-58" stroke="${profile.colors[1]}" stroke-width="4"/></g>`;
    case 'scroll': return `<g class="ccv4-weapon scroll"><path d="M205 304q43-18 79 0v65q-39-17-79 0z" fill="#eee3c9" stroke="${trim}" stroke-width="4"/><path d="M220 321h45M220 336h39M220 351h30" stroke="#6b5842" stroke-width="4"/></g>`;
    case 'bow': return `<g class="ccv4-weapon bow"><path d="M269 68q-70 106 0 238"/><path d="M268 68v238M250 183h55"/></g>`;
    default: return '';
  }
}

function headgear(profile) {
  const [main, sub, trim] = profile.colors;
  const cx = 161;
  switch (profile.head) {
    case 'commander': return `<g class="ccv4-headgear"><path d="M112 129q7-80 49-91q45 11 51 91l-24 17h-55z" fill="${main}" stroke="${trim}" stroke-width="6"/><path d="M161 41V8M145 23q18-24 40 1" stroke="${sub}" stroke-width="11"/><path d="M122 112h79" stroke="${trim}" stroke-width="5"/></g>`;
    case 'heavy': return `<g class="ccv4-headgear"><path d="M103 133q4-88 58-99q57 11 62 99l-30 25h-66z" fill="${main}" stroke="${trim}" stroke-width="7"/><path d="M161 35V3q31-4 39 20" stroke="${sub}" stroke-width="12"/><path d="M108 116h107" stroke="${trim}" stroke-width="5"/></g>`;
    case 'light': return `<g class="ccv4-headgear"><path d="M112 130q6-75 49-88q46 13 50 88l-24 18h-55z" fill="${main}" stroke="${trim}" stroke-width="6"/><path d="M161 43V11q25-5 37 13" stroke="#eef3f4" stroke-width="10"/></g>`;
    case 'scholar': return `<g class="ccv4-headgear"><path d="M121 128q10-70 63-75q31 20 25 75l-23 16h-51z" fill="${main}" stroke="${trim}" stroke-width="5"/><path d="M182 57l46-35" stroke="${trim}" stroke-width="7"/></g>`;
    case 'hood': return `<path class="ccv4-headgear" d="M93 163q-3-112 68-130q75 20 70 130l-36-42q-4-44-34-51q-32 8-36 51z" fill="${main}" stroke="${trim}" stroke-width="6"/>`;
    case 'soft': return `<path class="ccv4-headgear" d="M113 127q9-66 48-71q43 7 49 71l-26 19h-49z" fill="${main}" stroke="${trim}" stroke-width="5"/>`;
    case 'soldier': return `<path class="ccv4-headgear" d="M110 132q8-70 51-80q45 10 51 80l-25 17h-52z" fill="${main}" stroke="${trim}" stroke-width="5"/>`;
    default: return `<g class="ccv4-headgear"><path d="M105 119q56-31 112 0l-9 22q-47-22-94 0z" fill="${sub}" stroke="${trim}" stroke-width="5"/><path d="M207 128q44 18 27 44" stroke="${sub}" stroke-width="13"/></g>`;
  }
}

function beardMarkup(profile) {
  const hair = '#171616';
  if (profile.beard === 'long') return `<g class="ccv4-beard"><path d="M126 186q35 35 70 0q4 84-17 160l-17 38-18-45q-22-74-18-153z" fill="${hair}"/><path d="M142 209q18 56 20 135M177 209q-16 62-14 139" stroke="#39312d" stroke-width="5" opacity=".65"/></g>`;
  if (profile.beard === 'wide' || profile.beard === 'wild') return `<path class="ccv4-beard" d="M111 184q22 35 38 19q12 18 25 0q19 16 39-20q-1 59-31 82q-19-19-22 10q-6-28-25-8q-29-27-24-83z" fill="${hair}"/>`;
  if (profile.beard === 'short' || profile.beard === 'thin') return `<path class="ccv4-beard" d="M137 190q24 24 48 0q-2 46-24 53q-22-8-24-53z" fill="${hair}" opacity="${profile.beard === 'thin' ? '.74' : '1'}"/>`;
  return '';
}

function faceMarkup(profile) {
  const skin = profile.redFace ? '#a85d4e' : profile.pale ? '#d5a887' : '#d4a07b';
  const jaw = profile.face === 'square'
    ? 'M112 105q-7 88 17 121q31 30 64 0q24-34 16-121q-48-27-97 0z'
    : profile.face === 'long'
      ? 'M120 96q-12 103 15 143q27 35 52 0q28-42 15-143q-41-28-82 0z'
      : profile.face === 'round'
        ? 'M108 109q-5 81 20 113q33 31 66 0q26-31 18-113q-52-31-104 0z'
        : 'M116 99q-9 92 18 130q28 30 55 0q28-37 17-130q-45-27-90 0z';
  const eyeY = profile.expression === 'tired' ? 152 : 148;
  const browDrop = profile.expression === 'stern' || profile.expression === 'narrow' ? 7 : 2;
  const eyeWidth = profile.expression === 'wide' ? 15 : profile.expression === 'gentle' ? 13 : 10;
  return `<g class="ccv4-face"><path d="${jaw}" fill="${skin}"/><path d="M124 123q36-38 75 0q-12-48-38-51q-26 3-37 51z" fill="#171616"/>
    <path d="M126 ${eyeY-16}q15-${8+browDrop} 29-1M168 ${eyeY-1}q14-${8+browDrop} 28 1" stroke="#3a2a24" stroke-width="7" stroke-linecap="round"/>
    <path d="M129 ${eyeY}q${eyeWidth} -8 ${eyeWidth*2} 0M171 ${eyeY}q${eyeWidth} -8 ${eyeWidth*2} 0" stroke="#2b211f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="144" cy="${eyeY-2}" r="3.5" fill="#171311"/><circle cx="186" cy="${eyeY-2}" r="3.5" fill="#171311"/>
    <path d="M162 153q-8 30 1 38q8 4 15-2" stroke="#8f5a48" stroke-width="4" fill="none"/>
    <path d="M141 204q20 ${profile.expression === 'gentle' ? 12 : 5} 41 0" stroke="#6e3f36" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M120 169q7 15 23 18M204 169q-8 15-22 18" stroke="#a96c55" stroke-width="5" opacity=".36"/>
    ${profile.ageTone >= 3 ? '<path d="M122 158q15 9 28 5M176 163q13 4 27-5" stroke="#8d5a4c" stroke-width="3" opacity=".5"/>' : ''}
    ${profile.eyepatch ? '<path d="M165 132l47-27" stroke="#181617" stroke-width="8"/><rect x="174" y="137" width="31" height="23" rx="7" fill="#181617" stroke="#d0a45d" stroke-width="4"/><path d="M191 161l10 27" stroke="#6e3932" stroke-width="4"/>' : ''}
    ${profile.scar ? '<path d="M123 168l19 25M197 128l-15 31" stroke="#7a352f" stroke-width="4" opacity=".72"/>' : ''}
  </g>`;
}

function armorMarkup(profile) {
  const [main, sub, trim] = profile.colors;
  const shoulder = profile.body === 'massive' ? 54 : profile.body === 'tall' ? 45 : profile.body === 'slim' ? 30 : 39;
  return `<g class="ccv4-body"><path d="M34 420q12-139 89-181l38 30 40-30q79 43 91 181z" fill="url(#armor-${safeId(profile.name)})" stroke="#0d1214" stroke-width="7"/>
    <path d="M${107-shoulder} 286q20-52 61-57l20 28-28 76zM${215+shoulder} 286q-20-52-61-57l-20 28 28 76z" fill="${main}" stroke="${trim}" stroke-width="6"/>
    <path d="M115 260l46 48 45-48-13 160h-66z" fill="${sub}" opacity=".88"/>
    <path d="M112 290h99M101 322h121M91 354h141" stroke="${trim}" stroke-width="5" opacity=".74"/>
    <g class="ccv4-scales" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"><path d="M87 306q18 18 36 0q18 18 36 0q18 18 36 0q18 18 36 0"/><path d="M82 340q18 18 36 0q18 18 36 0q18 18 36 0q18 18 36 0"/><path d="M78 374q18 18 36 0q18 18 36 0q18 18 36 0q18 18 36 0"/></g>
    <circle cx="161" cy="306" r="25" fill="${main}" stroke="${trim}" stroke-width="6"/><text x="161" y="315" text-anchor="middle" font-size="25" font-weight="900" fill="${trim}">${profile.emblem}</text>
    <path d="M70 319l-19 80M250 319l20 80" stroke="#11181a" stroke-width="13" opacity=".6"/>
  </g>`;
}

export function renderHeroBust(heroId, className = 'story', state = 'idle') {
  const profile = HERO_LORE[heroId];
  if (!profile) return '';
  const [main, sub, trim] = profile.colors;
  const id = safeId(`${heroId}-${className}`);
  return `<svg class="hero-portrait ${esc(className)}" viewBox="0 0 320 420" role="img" aria-label="${esc(profile.name)}" data-commercial-art-v2="1" data-commercial-art-v4="1" data-hero-id="${esc(heroId)}" data-state="${esc(state)}">
    <defs>
      <linearGradient id="armor-${safeId(profile.name)}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${main}"/><stop offset=".52" stop-color="${sub}"/><stop offset="1" stop-color="#0e1417"/></linearGradient>
      <radialGradient id="halo-${id}" cx="50%" cy="35%" r="65%"><stop stop-color="${trim}" stop-opacity=".42"/><stop offset=".62" stop-color="${main}" stop-opacity=".18"/><stop offset="1" stop-color="#090d0f" stop-opacity="0"/></radialGradient>
      <filter id="shadow-${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#000" flood-opacity=".65"/></filter>
      <filter id="ink-${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".015" numOctaves="2" seed="${profile.age}" result="noise"/><feColorMatrix in="noise" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .14 0"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
    </defs>
    <ellipse class="ccv4-halo" cx="160" cy="190" rx="146" ry="177" fill="url(#halo-${id})"/>
    <path class="ccv4-ink-wash" d="M27 342q-34-122 52-239q80-91 184-19q78 59 28 236q-19 70-97 91q-126 33-167-69z" fill="${main}" opacity=".12"/>
    <g class="ccv4-character" filter="url(#shadow-${id})">${weaponMarkup(profile)}${armorMarkup(profile)}${faceMarkup(profile)}${headgear(profile)}${beardMarkup(profile)}
      <path class="ccv4-light" d="M116 103q-2 94 26 129q18 18 34 5q-35-14-36-134z" fill="#fff" opacity=".09"/>
      <path class="ccv4-weathering" d="M74 324l28 9M220 287l25 10M112 373l41 8M179 348l38 7" stroke="#f0d7a2" stroke-width="3" opacity=".28"/>
    </g>
    <g class="ccv4-nameplate"><path d="M24 386h271l-18 27H43z" fill="#0c1215" opacity=".9" stroke="${trim}" stroke-width="3"/><text x="43" y="407" font-size="18" font-weight="900" fill="${trim}">${esc(profile.name)}</text><text x="95" y="406" font-size="11" fill="#d9d1c3">${esc(profile.courtesy ? `자 ${profile.courtesy} · ${profile.weapon}` : profile.weapon)}</text></g>
  </svg>`;
}

function resolveHeroId(svg) {
  return svg.dataset.heroId || NAME_TO_ID.get(svg.getAttribute('aria-label') || '') || '';
}

function upgradeLargePortrait(svg) {
  if (!(svg instanceof SVGElement) || svg.dataset.commercialArtV4) return;
  const heroId = resolveHeroId(svg);
  if (!heroId || !CORE_BUSTS.has(heroId)) return;
  const classes = [...svg.classList];
  if (!classes.some((name) => ['story','poster','card','medium'].includes(name))) return;
  const state = svg.dataset.state || 'idle';
  const className = classes.filter((name) => name !== 'hero-portrait').join(' ');
  const holder = document.createElement('template');
  holder.innerHTML = renderHeroBust(heroId, className, state).trim();
  const next = holder.content.firstElementChild;
  if (next) svg.replaceWith(next);
}

function enrichSmallPortrait(svg) {
  if (!(svg instanceof SVGElement) || svg.dataset.commercialDepthV4) return;
  const heroId = resolveHeroId(svg);
  const profile = HERO_LORE[heroId];
  if (!profile) return;
  svg.dataset.commercialDepthV4 = '1';
  svg.dataset.age = String(profile.age);
  svg.dataset.build = profile.body;
  svg.dataset.weapon = profile.weaponShape;
  const viewBox = svg.viewBox?.baseVal;
  if (!viewBox?.width) return;
  const group = document.createElementNS(ns, 'g');
  group.setAttribute('class', 'ccv4-micro-detail');
  const scaleX = viewBox.width / 180;
  const scaleY = viewBox.height / 220;
  group.setAttribute('transform', `scale(${scaleX} ${scaleY})`);
  group.innerHTML = `<path d="M55 104q34-20 70 0" stroke="${profile.colors[2]}" stroke-width="2.4" opacity=".45"/><path d="M63 143l18 7M112 143l17-7" stroke="#fff" stroke-width="1.8" opacity=".17"/>${profile.eyepatch ? '<path d="M93 63l28-18" stroke="#171414" stroke-width="5"/><rect x="96" y="63" width="18" height="12" rx="3" fill="#171414"/>' : ''}${profile.scar ? '<path d="M64 78l10 14" stroke="#78352f" stroke-width="2.4"/>' : ''}`;
  svg.append(group);
}

function enhance() {
  scheduled = false;
  document.querySelectorAll('svg.hero-portrait').forEach((svg) => {
    upgradeLargePortrait(svg);
    if (svg.isConnected) enrichSmallPortrait(svg);
  });
  document.documentElement.classList.add('commercial-character-v4-ready');
  window.__commercialCharacterV4 = {
    ready: true,
    version: CHARACTER_ART_VERSION,
    coreBusts: [...CORE_BUSTS],
    profileCount: Object.keys(HERO_LORE).length,
    states: ['idle','walk','attack','skill','hit','guard','counter','critical','victory','retreat'],
  };
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(enhance);
}

if (typeof document !== 'undefined') {
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','data-state'] });
  schedule();
}
