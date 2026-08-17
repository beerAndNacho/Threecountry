export const GAME_VERSION = 2;
export const SAVE_KEY = 'threecountry:srpg:v2';

export const TERRAIN = {
  grass: { id: 'grass', name: '초지', move: 1, defense: 0, avoid: 0, icon: '野' },
  road: { id: 'road', name: '길', move: 1, defense: 0, avoid: 0, icon: '道' },
  forest: { id: 'forest', name: '숲', move: 2, defense: 3, avoid: 8, icon: '林' },
  hill: { id: 'hill', name: '언덕', move: 2, defense: 5, avoid: 4, icon: '丘' },
  village: { id: 'village', name: '마을', move: 1, defense: 2, avoid: 0, heal: 8, icon: '里' },
  camp: { id: 'camp', name: '지휘소', move: 1, defense: 5, avoid: 0, heal: 10, icon: '陣' },
  bridge: { id: 'bridge', name: '다리', move: 1, defense: 0, avoid: 0, icon: '橋' },
  river: { id: 'river', name: '하천', move: 99, defense: 0, avoid: 0, blocked: true, icon: '川' },
};

export const CLASSES = {
  cavalry: { id: 'cavalry', name: '기병', move: 5, range: [1, 1], strong: 'archer', weak: 'infantry', icon: '騎' },
  infantry: { id: 'infantry', name: '보병', move: 4, range: [1, 1], strong: 'cavalry', weak: 'archer', icon: '步' },
  archer: { id: 'archer', name: '궁병', move: 3, range: [2, 3], strong: 'infantry', weak: 'cavalry', icon: '弓' },
  strategist: { id: 'strategist', name: '책사', move: 3, range: [2, 3], strong: null, weak: null, icon: '策' },
  guardian: { id: 'guardian', name: '호위', move: 3, range: [1, 1], strong: 'cavalry', weak: 'archer', icon: '盾' },
};

export const HEROES = {
  cao: {
    id: 'cao', name: '조조', hanja: '曹操', title: '난세의 효웅', classId: 'cavalry',
    maxHp: 118, attack: 31, defense: 22, magic: 27, speed: 16, skillMax: 3,
    colors: ['#222a29', '#a94737', '#d8b26b'], face: '#e2ae86', hair: '#151817', headgear: 'crown', weapon: 'sword', emblem: '魏',
    quote: '완벽한 때를 기다리지 않는다. 먼저 움직여 때를 만든다.',
    passive: { name: '기회 포착', description: '적을 쓰러뜨리면 행동력이 1회 복구됩니다.' },
    skill: { id: 'command-shift', name: '지휘 전환', cost: 1, range: 2, type: 'support', description: '주변 아군의 공격·속도를 2턴 올리고 즉시 8 HP 회복.' },
  },
  xiahou: {
    id: 'xiahou', name: '하후돈', hanja: '夏侯惇', title: '불퇴의 장군', classId: 'infantry',
    maxHp: 136, attack: 30, defense: 29, magic: 12, speed: 11, skillMax: 3,
    colors: ['#273d4b', '#b49352', '#d8d2bd'], face: '#d7a27b', hair: '#181817', headgear: 'helm', weapon: 'shield', emblem: '守',
    quote: '이 선은 내 뒤로 물러나지 않는다.',
    passive: { name: '부상불퇴', description: 'HP가 절반 이하일 때 방어 +6, 반격 피해 +20%.' },
    skill: { id: 'iron-wall', name: '불퇴의 방진', cost: 1, range: 0, type: 'self', description: '2턴간 방어막 24와 도발을 얻습니다.' },
  },
  dian: {
    id: 'dian', name: '전위', hanja: '典韋', title: '문전의 수호자', classId: 'guardian',
    maxHp: 148, attack: 35, defense: 27, magic: 8, speed: 10, skillMax: 3,
    colors: ['#4a302b', '#b95a3f', '#d0aa6f'], face: '#ca9068', hair: '#211b18', headgear: 'band', weapon: 'club', emblem: '護',
    quote: '뒤는 보지 마십시오. 여기는 제가 막습니다.',
    passive: { name: '호위', description: '인접한 군주가 받는 피해의 35%를 대신 받습니다.' },
    skill: { id: 'guard-charge', name: '호위 돌격', cost: 1, range: 1, type: 'attack', power: 1.3, description: '강하게 내려쳐 1턴 기절시킵니다.' },
  },
  xun: {
    id: 'xun', name: '순욱', hanja: '荀彧', title: '왕좌의 설계자', classId: 'strategist',
    maxHp: 88, attack: 17, defense: 16, magic: 35, speed: 13, skillMax: 4,
    colors: ['#52736b', '#d7c08b', '#eff0df'], face: '#e8ba93', hair: '#2c2925', headgear: 'crown', weapon: 'scroll', emblem: '政',
    quote: '이긴 뒤에도 무너지지 않는 나라를 세워야 합니다.',
    passive: { name: '정무망', description: '턴 시작 시 가장 HP가 낮은 아군을 5 회복.' },
    skill: { id: 'royal-plan', name: '왕좌의 설계', cost: 1, range: 3, type: 'heal', power: 24, description: '아군을 크게 회복하고 기술력을 1 회복.' },
  },
  guo: {
    id: 'guo', name: '곽가', hanja: '郭嘉', title: '한발 앞선 책사', classId: 'strategist',
    maxHp: 82, attack: 15, defense: 14, magic: 38, speed: 18, skillMax: 4,
    colors: ['#5b526d', '#c6a5c8', '#e6dcc3'], face: '#e0ad87', hair: '#211f22', headgear: 'hood', weapon: 'fan', emblem: '策',
    quote: '완벽한 때를 기다리면 적도 완벽해집니다.',
    passive: { name: '선견', description: '첫 공격의 치명타 확률 +35%.' },
    skill: { id: 'read-flaw', name: '허점 간파', cost: 1, range: 4, type: 'attack', power: 1.45, magic: true, description: '원거리 책략 피해를 주고 2턴 이동을 봉쇄.' },
  },
  xu: {
    id: 'xu', name: '허저', hanja: '許褚', title: '중군의 방패', classId: 'guardian',
    maxHp: 156, attack: 34, defense: 31, magic: 6, speed: 8, skillMax: 3,
    colors: ['#363c36', '#b49352', '#d5c79e'], face: '#c98d63', hair: '#1d1c19', headgear: 'helm', weapon: 'shield', emblem: '壁',
    quote: '중군이 서 있으면 군단은 무너지지 않습니다.',
    passive: { name: '중군의 방패', description: '인접 아군의 방어 +3.' },
    skill: { id: 'tiger-guard', name: '호치의 반격', cost: 1, range: 0, type: 'self', description: '2턴간 반격 거리 +1, 반격 피해 +50%.' },
  },
  liu: {
    id: 'liu', name: '유비', hanja: '劉備', title: '사람을 얻는 군주', classId: 'infantry',
    maxHp: 122, attack: 28, defense: 23, magic: 24, speed: 14, skillMax: 3,
    colors: ['#315f52', '#d7b56d', '#ece3c5'], face: '#e6b18a', hair: '#28231e', headgear: 'crown', weapon: 'sword', emblem: '蜀',
    quote: '성 하나보다 그 안의 사람을 먼저 얻겠소.',
    passive: { name: '인의의 깃발', description: '주변 아군의 사기와 방어를 올립니다.' },
    skill: { id: 'benevolent-banner', name: '인의의 깃발', cost: 1, range: 2, type: 'support', description: '주변 아군을 회복하고 공격·방어를 올립니다.' },
  },
  guan: {
    id: 'guan', name: '관우', hanja: '關羽', title: '의기의 선봉', classId: 'cavalry',
    maxHp: 142, attack: 38, defense: 27, magic: 15, speed: 14, skillMax: 3,
    colors: ['#244f45', '#a94737', '#d8b26b'], face: '#b9755b', hair: '#181816', headgear: 'band', weapon: 'spear', emblem: '義',
    quote: '승부보다 먼저 지켜야 할 약속이 있소.',
    passive: { name: '위엄', description: '첫 교전에서 대상 방어를 일부 무시.' },
    skill: { id: 'green-dragon', name: '청룡 돌파', cost: 1, range: 1, type: 'attack', power: 1.55, description: '강력한 일격 후 뒤쪽 칸까지 관통 피해.' },
  },
  zhang: {
    id: 'zhang', name: '장비', hanja: '張飛', title: '벽력의 맹장', classId: 'cavalry',
    maxHp: 150, attack: 39, defense: 24, magic: 7, speed: 12, skillMax: 3,
    colors: ['#5a2c2b', '#d28b42', '#c9aa72'], face: '#aa684c', hair: '#151313', headgear: 'band', weapon: 'spear', emblem: '雷',
    quote: '첫 번에 기세를 꺾겠소!',
    passive: { name: '호통', description: '공격한 적의 공격을 1턴 낮춥니다.' },
    skill: { id: 'thunder-roar', name: '장판교의 호통', cost: 1, range: 2, type: 'area', power: 0.75, description: '주변 적에게 피해를 주고 1턴 기절시킬 수 있습니다.' },
  },
  zhao: {
    id: 'zhao', name: '조운', hanja: '趙雲', title: '천리의 구원자', classId: 'cavalry',
    maxHp: 130, attack: 35, defense: 25, magic: 15, speed: 20, skillMax: 3,
    colors: ['#627a83', '#e6e3d7', '#b49352'], face: '#e1ad86', hair: '#242526', headgear: 'helm', weapon: 'spear', emblem: '救',
    quote: '퇴로는 남아 있습니다. 제가 지키겠습니다.',
    passive: { name: '천리 구원', description: 'HP가 낮은 아군 쪽으로 이동할 때 이동력 +2.' },
    skill: { id: 'silver-rescue', name: '은창 구원', cost: 1, range: 3, type: 'dash', power: 1.2, description: '대상에게 돌진하며 인접 아군의 방어막을 회복.' },
  },
  'soldier-spear': {
    id: 'soldier-spear', name: '창병대', hanja: '槍兵', title: '유비군 정예', classId: 'infantry',
    maxHp: 82, attack: 23, defense: 19, magic: 4, speed: 9, skillMax: 0,
    colors: ['#45594d', '#af6d43', '#b7a06e'], face: '#c78e68', hair: '#222', headgear: 'helm', weapon: 'spear', emblem: '兵', quote: '', passive: null, skill: null,
  },
  'soldier-archer': {
    id: 'soldier-archer', name: '궁병대', hanja: '弓兵', title: '유비군 사수', classId: 'archer',
    maxHp: 68, attack: 21, defense: 13, magic: 6, speed: 11, skillMax: 0,
    colors: ['#59674d', '#9b6f43', '#c2a77b'], face: '#c78e68', hair: '#222', headgear: 'band', weapon: 'bow', emblem: '弓', quote: '', passive: null, skill: null,
  },
};

export const PLAYER_ROSTER = ['cao', 'xiahou', 'dian', 'xun', 'guo', 'xu'];
export const DEFAULT_PARTY = ['cao', 'xiahou', 'dian', 'guo'];

export const STRATEGIES = {
  assault: { id: 'assault', name: '선봉 돌파', icon: '⚔', description: '1턴 이동력 +1, 첫 공격 피해 +15%.', bonuses: { firstMove: 1, firstDamage: 0.15 } },
  steady: { id: 'steady', name: '정공 방진', icon: '盾', description: '모든 장수 방어 +3, 시작 시 방어막 10.', bonuses: { defense: 3, shield: 10 } },
  ambush: { id: 'ambush', name: '숲길 기습', icon: '策', description: '숲에서 이동 비용 1, 첫 기술 비용 0.', bonuses: { forestMove: 1, freeSkill: true } },
};

export const FACILITIES = {
  barracks: { id: 'barracks', name: '병영', icon: '兵', description: '출전 장수 최대 HP +4%/레벨', baseCost: { gold: 180, grain: 80 } },
  market: { id: 'market', name: '시장', icon: '商', description: '전투 보상 금 +12%/레벨', baseCost: { gold: 150, grain: 40 } },
  granary: { id: 'granary', name: '군량창', icon: '糧', description: '전투 시작 기술력 +1(2레벨부터)', baseCost: { gold: 120, grain: 100 } },
  academy: { id: 'academy', name: '군사부', icon: '策', description: '책략 피해·회복 +5%/레벨', baseCost: { gold: 220, grain: 60 } },
};

export const CHAPTER = {
  id: 'chapter-1', number: 1, title: '진류의 첫 깃발', subtitle: '허창과 낙양 사이, 비어 있는 중원의 요충지',
  objective: '유비를 격파하거나 적 지휘소를 점령하십시오.', turnLimit: 12,
  rewards: { gold: 360, grain: 240, fame: 45 },
};

export const STORY = {
  prologue: [
    { speaker: 'narrator', name: '군웅력 원년 · 봄', text: '낙양의 권위가 무너지고 각지의 군웅이 깃발을 들었다. 허창과 낙양 사이의 진류는 아직 어느 세력에도 완전히 속하지 않았다.' },
    { speaker: 'cao', name: '조조', text: '진류를 얻으면 낙양을 견제할 길과 군량을 동시에 얻는다. 시간이 우리 편은 아니다.' },
    { speaker: 'guo', name: '곽가', text: '유비군도 움직였습니다. 관우와 장비가 선봉, 유비는 마을 사람을 달래며 뒤따르고 있습니다.' },
    { speaker: 'xiahou', name: '하후돈', text: '그렇다면 길목에서 맞아야겠군. 장수는 누구를 데려가겠나?' },
    { speaker: 'cao', name: '조조', text: '네 명이면 충분하다. 숫자가 아니라 자리를 맞춰라. 이번 싸움이 우리 군의 첫 기준이 된다.' },
  ],
  deployment: [
    { speaker: 'guo', name: '곽가', text: '하천은 중앙을 가르지만 두 곳에 다리가 있습니다. 숲을 이용하면 궁병의 시야를 끊을 수 있습니다.' },
    { speaker: 'cao', name: '조조', text: '전투는 시작 전 절반이 결정된다. 진입 전략과 배치를 선택하라.' },
  ],
  boss: [
    { speaker: 'liu', name: '유비', text: '진류의 백성을 전리품으로 삼을 수는 없소. 이곳에서 물러나 주시오.' },
    { speaker: 'cao', name: '조조', text: '백성을 지키려면 먼저 난세를 끝낼 힘이 있어야 한다. 그 힘을 증명해 보시오.' },
  ],
  victory: [
    { speaker: 'narrator', name: '전후 기록', text: '진류의 깃발이 조조군의 색으로 바뀌었다. 그러나 백성은 새 주인이 무엇을 선택할지 지켜보고 있다.' },
    { speaker: 'xun', name: '순욱', text: '승리보다 전후 처리가 중요합니다. 창고를 열어 민심을 얻거나, 병영을 정비해 다음 공격에 대비할 수 있습니다.' },
    { speaker: 'cao', name: '조조', text: '좋다. 진류를 점령지가 아니라 기반으로 만든다. 다음 계절의 명령을 정하라.' },
  ],
  defeat: [
    { speaker: 'xiahou', name: '하후돈', text: '대열은 아직 살아 있다. 병력을 수습하고 다시 진입하면 된다.' },
    { speaker: 'cao', name: '조조', text: '패배는 기록이다. 무엇이 부족했는지 확인한 뒤 같은 실수를 반복하지 마라.' },
  ],
};

export const MAP = [
  ['forest','forest','grass','road','road','river','grass','forest','forest','hill','grass','camp'],
  ['forest','grass','grass','road','grass','river','grass','forest','grass','hill','road','grass'],
  ['grass','grass','road','road','bridge','bridge','road','road','village','grass','road','grass'],
  ['hill','grass','grass','road','grass','river','forest','grass','grass','road','road','camp'],
  ['hill','forest','grass','road','grass','river','forest','forest','grass','road','grass','grass'],
  ['grass','forest','road','road','bridge','bridge','road','village','road','road','grass','grass'],
  ['camp','grass','road','grass','grass','river','grass','forest','hill','grass','forest','grass'],
  ['grass','grass','road','grass','forest','river','grass','grass','hill','grass','forest','forest'],
];

export const DEPLOYMENT_SLOTS = [
  { x: 0, y: 6, label: '좌선봉' },
  { x: 1, y: 7, label: '중선봉' },
  { x: 0, y: 7, label: '좌후군' },
  { x: 2, y: 7, label: '우후군' },
];

export const ENEMY_SPAWNS = [
  { heroId: 'liu', x: 11, y: 3, leader: true },
  { heroId: 'guan', x: 9, y: 1 },
  { heroId: 'zhang', x: 9, y: 5 },
  { heroId: 'zhao', x: 10, y: 6 },
  { heroId: 'soldier-archer', x: 8, y: 2 },
  { heroId: 'soldier-spear', x: 8, y: 5 },
];
