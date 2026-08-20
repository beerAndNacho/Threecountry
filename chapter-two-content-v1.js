import { HEROES } from './content.js';

export const CHAPTER_TWO_VERSION = '1.3.0';

const NEW_HEROES = {
  huaxiong: {
    id: 'huaxiong', name: '화웅', hanja: '華雄', title: '사수관의 맹장', classId: 'infantry',
    maxHp: 154, attack: 39, defense: 30, magic: 8, speed: 12, skillMax: 3,
    colors: ['#3d3230', '#9d3f32', '#d0a15d'], face: '#b97859', hair: '#181514', headgear: 'helm', weapon: 'spear', emblem: '關',
    quote: '관문을 넘으려면 먼저 나를 꺾어라.',
    passive: { name: '관문지장', description: '언덕·지휘소에서 방어 +5, 첫 피격 피해 -20%.' },
    skill: { id: 'gate-crusher', name: '관문 쇄도', cost: 1, range: 1, type: 'attack', power: 1.45, description: '강한 일격을 가하고 대상을 한 칸 밀어냅니다.' },
  },
  jiaxu: {
    id: 'jiaxu', name: '가후', hanja: '賈詡', title: '살아남는 독계', classId: 'strategist',
    maxHp: 96, attack: 16, defense: 19, magic: 42, speed: 17, skillMax: 4,
    colors: ['#292432', '#71536f', '#c9a86c'], face: '#d6a27f', hair: '#201c20', headgear: 'hood', weapon: 'fan', emblem: '毒',
    quote: '살아남은 뒤에도 선택지는 남아 있어야 합니다.',
    passive: { name: '독계', description: '책략 피해를 준 대상의 공격을 2턴 낮춥니다.' },
    skill: { id: 'black-feather', name: '흑우의 계', cost: 1, range: 4, type: 'attack', power: 1.38, magic: true, description: '원거리 책략 피해와 이동 봉쇄를 부여합니다.' },
  },
  lubu: {
    id: 'lubu', name: '여포', hanja: '呂布', title: '비장', classId: 'cavalry',
    maxHp: 176, attack: 47, defense: 29, magic: 9, speed: 20, skillMax: 3,
    colors: ['#2e2529', '#a62f37', '#d6ad56'], face: '#bf8060', hair: '#171315', headgear: 'helm', weapon: 'spear', emblem: '飛',
    quote: '계책이 길다면 길을 열겠다. 내 앞에 세워라.',
    passive: { name: '비장무쌍', description: 'HP 50% 이하에서 공격 +7, 이동 +1, 반격 피해 +30%.' },
    skill: { id: 'sky-piercer', name: '방천화극', cost: 1, range: 1, type: 'attack', power: 1.72, description: '대상을 강타하고 인접 적에게 충격 피해를 줍니다.' },
  },
  dongzhuo: {
    id: 'dongzhuo', name: '동탁', hanja: '董卓', title: '낙양의 폭군', classId: 'guardian',
    maxHp: 210, attack: 36, defense: 36, magic: 24, speed: 7, skillMax: 4,
    colors: ['#3f3229', '#7f3c2c', '#d1a85e'], face: '#aa7150', hair: '#181512', headgear: 'crown', weapon: 'shield', emblem: '暴',
    quote: '천하가 혼란하다면 먼저 움켜쥔 자가 질서를 정한다.',
    passive: { name: '강압 통치', description: '주변 서량군의 공격·방어 +3. 자신은 매 턴 보호막 8 획득.' },
    skill: { id: 'tyrant-order', name: '폭군의 호령', cost: 1, range: 2, type: 'support', description: '주변 적군의 공격·속도를 올리고 아군의 공격을 낮춥니다.' },
  },
  'soldier-xiliang': {
    id: 'soldier-xiliang', name: '서량기병', hanja: '西涼騎', title: '동탁군 기병', classId: 'cavalry',
    maxHp: 92, attack: 28, defense: 19, magic: 3, speed: 14, skillMax: 0,
    colors: ['#423930', '#985237', '#c59e5e'], face: '#b77d5d', hair: '#211b18', headgear: 'helm', weapon: 'spear', emblem: '涼', quote: '', passive: null, skill: null,
  },
  'soldier-crossbow': {
    id: 'soldier-crossbow', name: '연노병', hanja: '連弩兵', title: '낙양 수비군', classId: 'archer',
    maxHp: 74, attack: 25, defense: 15, magic: 6, speed: 10, skillMax: 0,
    colors: ['#4b463c', '#7c6040', '#c2a366'], face: '#bd8664', hair: '#282018', headgear: 'band', weapon: 'bow', emblem: '弩', quote: '', passive: null, skill: null,
  },
};

Object.assign(HEROES, NEW_HEROES);

export const CHAPTER_TWO_OPERATIONS = [
  {
    id: 'hulao-scout', order: 1, chapter: '2-1', name: '호뢰관 전초', label: '관문전', icon: '關', danger: 2,
    description: '화웅이 지키는 좁은 관문을 측면 숲길과 언덕으로 무너뜨립니다.',
    objective: '화웅 격파 또는 관문 지휘소 점령.', turnLimit: 10, par: 7,
    enemyScale: 1.02, elite: ['huaxiong'], eliteScale: 1.12, rewards: { gold: 260, grain: 180, fame: 15 },
    bonus: '화웅의 첫 기술을 방어', weather: '산바람', weatherId: 'wind', leaderHeroId: 'huaxiong',
  },
  {
    id: 'poisoned-dispatch', order: 2, chapter: '2-2', name: '독계의 전령', label: '책략전', icon: '毒', danger: 3,
    description: '안개와 독계 속에서 가후의 전령망을 끊고 퇴로를 확보합니다.',
    objective: '가후를 격파하고 동쪽 지휘소 확보.', turnLimit: 11, par: 8,
    enemyScale: 1.06, elite: ['jiaxu'], eliteScale: 1.14, rewards: { gold: 300, grain: 190, fame: 18 },
    bonus: '책사 1명 이상 생존', weather: '독안개', weatherId: 'mist', leaderHeroId: 'jiaxu',
  },
  {
    id: 'flying-general', order: 3, chapter: '2-3', name: '비장의 질주', label: '보스전', icon: '飛', danger: 4,
    description: '여포의 고속 돌파를 유인하고 지형·호위·반격으로 포위망을 완성합니다.',
    objective: '여포 격파. 지휘소 점령만으로는 승리할 수 없습니다.', turnLimit: 10, par: 8,
    enemyScale: 1.1, elite: ['lubu'], eliteScale: 1.18, rewards: { gold: 390, grain: 220, fame: 24 },
    bonus: '조조 생존·전원 40% HP 이상', weather: '붉은 노을', weatherId: 'ember', leaderHeroId: 'lubu', leaderRequired: true,
  },
  {
    id: 'burning-luoyang', order: 4, chapter: '2-4', name: '불타는 낙양', label: '장 결전', icon: '洛', danger: 4,
    description: '불길과 서량 증원 속에서 동탁의 본진을 돌파하고 주민 탈출로를 확보합니다.',
    objective: '동탁 격파 또는 황궁 지휘소 점령.', turnLimit: 13, par: 9,
    enemyScale: 1.14, elite: ['dongzhuo', 'lubu', 'jiaxu'], eliteScale: 1.1, rewards: { gold: 520, grain: 300, fame: 34 },
    bonus: '9턴 이내·전원 생존', weather: '화염과 연기', weatherId: 'ember', leaderHeroId: 'dongzhuo',
  },
];

const M = {
  'hulao-scout': {
    objective: { x: 11, y: 3 }, playerSpawns: [{x:0,y:3},{x:0,y:4},{x:1,y:2},{x:1,y:5}],
    enemySpawns: [
      {heroId:'huaxiong',x:10,y:3,leader:true},{heroId:'soldier-xiliang',x:8,y:2},{heroId:'soldier-xiliang',x:8,y:5},
      {heroId:'soldier-crossbow',x:9,y:1},{heroId:'soldier-crossbow',x:9,y:6},{heroId:'soldier-xiliang',x:7,y:4},
    ],
    terrain: [
      ['hill','hill','forest','hill','hill','forest','hill','hill','forest','hill','hill','hill'],
      ['hill','forest','grass','road','grass','forest','hill','forest','grass','road','grass','hill'],
      ['forest','grass','road','road','road','grass','hill','grass','road','road','grass','hill'],
      ['road','road','road','grass','road','road','bridge','road','road','road','road','camp'],
      ['road','road','grass','road','road','road','bridge','road','road','road','grass','hill'],
      ['forest','grass','road','grass','forest','grass','hill','grass','road','grass','grass','hill'],
      ['hill','forest','grass','hill','forest','hill','hill','forest','grass','road','forest','hill'],
      ['hill','hill','forest','hill','hill','forest','hill','hill','forest','hill','hill','hill'],
    ],
  },
  'poisoned-dispatch': {
    objective: { x: 11, y: 5 }, playerSpawns: [{x:0,y:6},{x:1,y:7},{x:0,y:7},{x:2,y:7}],
    enemySpawns: [
      {heroId:'jiaxu',x:11,y:5,leader:true},{heroId:'soldier-crossbow',x:9,y:2},{heroId:'soldier-crossbow',x:8,y:5},
      {heroId:'soldier-xiliang',x:7,y:3},{heroId:'soldier-xiliang',x:9,y:6},{heroId:'soldier-crossbow',x:10,y:0},
    ],
    terrain: [
      ['forest','forest','grass','road','hill','grass','forest','forest','grass','road','grass','grass'],
      ['forest','grass','grass','road','forest','grass','river','forest','grass','road','hill','grass'],
      ['grass','road','road','road','forest','grass','river','grass','road','road','grass','grass'],
      ['hill','grass','forest','road','bridge','bridge','bridge','road','forest','grass','road','grass'],
      ['forest','grass','forest','road','river','river','river','road','forest','grass','road','grass'],
      ['grass','road','road','road','bridge','bridge','bridge','road','road','road','road','camp'],
      ['camp','grass','forest','road','grass','forest','river','grass','hill','road','grass','grass'],
      ['grass','grass','road','road','forest','grass','river','grass','grass','road','forest','forest'],
    ],
  },
  'flying-general': {
    objective: { x: 11, y: 3 }, playerSpawns: [{x:0,y:3},{x:0,y:4},{x:1,y:2},{x:1,y:5}],
    enemySpawns: [
      {heroId:'lubu',x:8,y:3,leader:true},{heroId:'soldier-xiliang',x:9,y:1},{heroId:'soldier-xiliang',x:9,y:5},
      {heroId:'soldier-crossbow',x:10,y:2},{heroId:'soldier-crossbow',x:10,y:6},{heroId:'soldier-xiliang',x:7,y:4},
    ],
    terrain: [
      ['grass','hill','grass','road','grass','hill','grass','road','grass','hill','grass','grass'],
      ['grass','grass','road','road','grass','grass','road','road','grass','grass','road','grass'],
      ['hill','road','road','grass','road','road','grass','road','road','grass','road','grass'],
      ['camp','road','grass','road','road','grass','road','road','road','road','road','camp'],
      ['grass','road','road','road','grass','road','road','grass','road','road','grass','grass'],
      ['grass','road','grass','road','road','grass','road','road','road','road','road','grass'],
      ['hill','grass','road','grass','road','road','grass','road','grass','road','grass','grass'],
      ['grass','hill','grass','road','grass','hill','grass','road','grass','hill','grass','grass'],
    ],
  },
  'burning-luoyang': {
    objective: { x: 11, y: 3 }, playerSpawns: [{x:0,y:6},{x:1,y:7},{x:0,y:7},{x:2,y:7}],
    enemySpawns: [
      {heroId:'dongzhuo',x:11,y:3,leader:true},{heroId:'lubu',x:9,y:4},{heroId:'jiaxu',x:10,y:1},
      {heroId:'soldier-xiliang',x:8,y:2},{heroId:'soldier-xiliang',x:7,y:6},{heroId:'soldier-crossbow',x:9,y:0},{heroId:'soldier-crossbow',x:10,y:6},
    ],
    reinforcements: { turn: 5, units: [{heroId:'soldier-xiliang',x:11,y:7},{heroId:'soldier-crossbow',x:11,y:0}] },
    terrain: [
      ['forest','grass','road','grass','hill','grass','road','grass','river','grass','road','grass'],
      ['grass','village','road','forest','grass','road','road','grass','river','road','road','grass'],
      ['hill','road','road','road','village','road','forest','road','bridge','road','road','grass'],
      ['camp','road','grass','road','forest','road','grass','road','river','road','road','camp'],
      ['grass','road','village','road','forest','road','grass','road','river','road','grass','grass'],
      ['forest','road','road','road','village','road','forest','road','bridge','road','road','grass'],
      ['grass','grass','road','forest','hill','road','road','grass','river','village','grass','grass'],
      ['forest','grass','road','grass','grass','grass','road','grass','river','hill','grass','grass'],
    ],
  },
};

export const CHAPTER_TWO_MAPS = Object.fromEntries(CHAPTER_TWO_OPERATIONS.map((operation) => [operation.id, {
  ...M[operation.id], id: operation.id, name: operation.name, weather: operation.weather, weatherId: operation.weatherId,
  special: operation.description, objective: { ...M[operation.id].objective, leaderHeroId: operation.leaderHeroId },
}]));

export function validateChapterTwo() {
  const errors = [];
  for (const operation of CHAPTER_TWO_OPERATIONS) {
    const map = CHAPTER_TWO_MAPS[operation.id];
    if (!map) { errors.push(`${operation.id}: missing map`); continue; }
    if (map.terrain.length !== 8 || map.terrain.some((row) => row.length !== 12)) errors.push(`${operation.id}: map must be 12x8`);
    if (map.terrain[map.objective.y]?.[map.objective.x] !== 'camp') errors.push(`${operation.id}: objective must be camp`);
    const positions = [...map.playerSpawns, ...map.enemySpawns];
    const keys = positions.map((position) => `${position.x},${position.y}`);
    if (new Set(keys).size !== keys.length) errors.push(`${operation.id}: duplicate spawn`);
    for (const position of positions) {
      if (position.x < 0 || position.x >= 12 || position.y < 0 || position.y >= 8) errors.push(`${operation.id}: spawn out of bounds`);
      if (map.terrain[position.y]?.[position.x] === 'river') errors.push(`${operation.id}: spawn on river`);
      if (!HEROES[position.heroId] && position.heroId) errors.push(`${operation.id}: missing hero ${position.heroId}`);
    }
  }
  return errors;
}
