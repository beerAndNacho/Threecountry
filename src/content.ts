import type {
  CityDefinition,
  CityId,
  EventChoiceDefinition,
  FactionDefinition,
  FactionId,
  Formation,
  OfficerDefinition,
  OfficerId,
  StoryEventDefinition,
  Tactic,
  TroopType,
} from './types.js';

export const CITY_DEFINITIONS: Record<CityId, CityDefinition> = {
  xuchang: {
    id: 'xuchang',
    name: '허창',
    hanja: '許昌',
    subtitle: '중원의 행정 중심',
    x: 16,
    y: 62,
    neighbors: ['chenliu'],
  },
  chenliu: {
    id: 'chenliu',
    name: '진류',
    hanja: '陳留',
    subtitle: '상단과 길이 만나는 땅',
    x: 50,
    y: 38,
    neighbors: ['xuchang', 'luoyang'],
  },
  luoyang: {
    id: 'luoyang',
    name: '낙양',
    hanja: '洛陽',
    subtitle: '높은 성벽의 옛 도읍',
    x: 84,
    y: 62,
    neighbors: ['chenliu'],
  },
};

export const FACTIONS: Record<Exclude<FactionId, 'neutral'>, FactionDefinition> = {
  cao: {
    id: 'cao',
    name: '조조군',
    lordId: 'cao_cao',
    capitalId: 'xuchang',
    motto: '능력을 모아 기회를 놓치지 않는다',
    strength: '행동 순서와 인재 운용이 유연합니다.',
    risk: '명분과 공적을 무시하면 내부 신뢰가 흔들립니다.',
    color: '#a94737',
    pale: '#f4ded8',
  },
  liu: {
    id: 'liu',
    name: '유비군',
    lordId: 'liu_bei',
    capitalId: 'luoyang',
    motto: '사람과 민심을 모아 난세를 건넌다',
    strength: '등용과 충성, 패배 후 회복이 안정적입니다.',
    risk: '강압적인 선택을 반복하면 고유 강점이 약해집니다.',
    color: '#4e8174',
    pale: '#dcece6',
  },
};

export const OFFICERS: Record<OfficerId, OfficerDefinition> = {
  cao_cao: {
    id: 'cao_cao', name: '조조', hanja: '曹操', factionAffinity: 'cao', role: '군주 · 유연 지휘',
    summary: '능력 있는 인재를 빠르게 배치하고 위기 때 행동을 다시 설계합니다.',
    quote: '오늘 무엇을 할 수 있는지 말하시오.',
    stats: { command: 95, martial: 77, intellect: 93, politics: 92, charm: 88 },
    aptitudes: { infantry: 'A', cavalry: 'A', archer: 'B' }, trait: 'flexible', traitName: '능력 본위',
    weakness: '조약과 공적을 가볍게 다루면 신뢰가 빠르게 낮아집니다.', color: '#6d3430', accent: '#d19a7e', homeCityId: 'xuchang',
  },
  xiahou_dun: {
    id: 'xiahou_dun', name: '하후돈', hanja: '夏侯惇', factionAffinity: 'cao', role: '중앙 방어 · 국경 태수',
    summary: '부상과 사기 저하에도 중앙선을 붙잡는 묵직한 보병 지휘관입니다.',
    quote: '이 선은 내 뒤로 물러나지 않소.',
    stats: { command: 89, martial: 91, intellect: 67, politics: 70, charm: 82 },
    aptitudes: { infantry: 'S', cavalry: 'A', archer: 'C' }, trait: 'steadfast', traitName: '부상불퇴',
    weakness: '복잡한 책략과 먼 추격에는 별도 참모가 필요합니다.', color: '#354b5e', accent: '#bd765c', homeCityId: 'xuchang',
  },
  dian_wei: {
    id: 'dian_wei', name: '전위', hanja: '典韋', factionAffinity: 'cao', role: '군주 호위 · 반격',
    summary: '중군의 치명적인 공격을 대신 받고 즉시 반격하는 근접 호위장입니다.',
    quote: '뒤는 보지 마십시오. 여기는 제가 막습니다.',
    stats: { command: 78, martial: 99, intellect: 40, politics: 34, charm: 66 },
    aptitudes: { infantry: 'S', cavalry: 'A', archer: 'C' }, trait: 'bodyguard', traitName: '문전의 수호자',
    weakness: '책략과 원거리 집중 공격에 약하고 피로가 빠르게 쌓입니다.', color: '#4b4038', accent: '#b45c46', homeCityId: 'xuchang',
  },
  xun_yu: {
    id: 'xun_yu', name: '순욱', hanja: '荀彧', factionAffinity: 'cao', role: '경제 · 명분 · 충성',
    summary: '빠르게 넓힌 영토가 무너지지 않도록 수입과 명분을 설계합니다.',
    quote: '이긴 뒤에도 무너지지 않는 나라여야 합니다.',
    stats: { command: 84, martial: 36, intellect: 96, politics: 99, charm: 92 },
    aptitudes: { infantry: 'C', cavalry: 'C', archer: 'B' }, trait: 'steward', traitName: '왕좌의 설계',
    weakness: '강제 징발과 조약 파기를 반복하는 군주와 충돌합니다.', color: '#607d72', accent: '#c8ad75', homeCityId: 'xuchang',
  },
  guo_jia: {
    id: 'guo_jia', name: '곽가', hanja: '郭嘉', factionAffinity: 'cao', role: '예측 · 기습 · 단기전',
    summary: '적의 다음 행동을 먼저 읽고 세 라운드 안에 승부를 끝내려 합니다.',
    quote: '완벽한 때를 기다리면 적도 완벽해집니다.',
    stats: { command: 83, martial: 34, intellect: 99, politics: 85, charm: 78 },
    aptitudes: { infantry: 'C', cavalry: 'B', archer: 'A' }, trait: 'insight', traitName: '한발 앞선 판단',
    weakness: '장기 원정과 반복 출전에서 피로와 부상 위험이 큽니다.', color: '#76647f', accent: '#bca1bd', homeCityId: 'chenliu',
  },
  xu_chu: {
    id: 'xu_chu', name: '허저', hanja: '許褚', factionAffinity: 'cao', role: '중군 방벽 · 결투',
    summary: '중군의 사기 충격을 줄이고 한 라운드를 버틴 뒤 강하게 반격합니다.',
    quote: '중군이 서 있으면 군단은 무너지지 않습니다.',
    stats: { command: 80, martial: 98, intellect: 42, politics: 36, charm: 68 },
    aptitudes: { infantry: 'S', cavalry: 'A', archer: 'C' }, trait: 'bulwark', traitName: '중군의 방패',
    weakness: '이동과 추격이 느리고 내정 임무에는 적합하지 않습니다.', color: '#3f4540', accent: '#c39c67', homeCityId: 'chenliu',
  },
  liu_bei: {
    id: 'liu_bei', name: '유비', hanja: '劉備', factionAffinity: 'liu', role: '군주 · 등용 · 민심',
    summary: '약한 기반에서도 사람을 잃지 않고 새 인재를 끌어모읍니다.',
    quote: '천하는 땅보다 사람에게서 시작하오.',
    stats: { command: 84, martial: 73, intellect: 82, politics: 80, charm: 98 },
    aptitudes: { infantry: 'A', cavalry: 'B', archer: 'B' }, trait: 'benevolence', traitName: '사람을 얻는 그릇',
    weakness: '약탈과 강압을 반복하면 장수 관계와 고유 효과가 약해집니다.', color: '#477467', accent: '#d4b26b', homeCityId: 'luoyang',
  },
  guan_yu: {
    id: 'guan_yu', name: '관우', hanja: '關羽', factionAffinity: 'liu', role: '선봉 · 결투 · 위엄',
    summary: '높은 충성과 우호 관계를 바탕으로 한 라인을 압도합니다.',
    quote: '승부보다 먼저 지켜야 할 약속이 있소.',
    stats: { command: 94, martial: 96, intellect: 79, politics: 65, charm: 88 },
    aptitudes: { infantry: 'S', cavalry: 'A', archer: 'C' }, trait: 'vanguard', traitName: '의기의 선봉',
    weakness: '공적과 관직을 무시하면 자존과 관계 문제가 생깁니다.', color: '#315f58', accent: '#a94737', homeCityId: 'luoyang',
  },
  zhang_fei: {
    id: 'zhang_fei', name: '장비', hanja: '張飛', factionAffinity: 'liu', role: '초반 돌파 · 사기 붕괴',
    summary: '첫 두 라운드에 적 사기를 크게 흔들지만 장기전에는 빠르게 지칩니다.',
    quote: '첫 번에 기세를 꺾겠소!',
    stats: { command: 88, martial: 98, intellect: 48, politics: 42, charm: 74 },
    aptitudes: { infantry: 'A', cavalry: 'S', archer: 'C' }, trait: 'roar', traitName: '벽력의 호통',
    weakness: '피로와 군율을 방치하면 아군 치안과 관계가 흔들립니다.', color: '#6a3035', accent: '#b78a5c', homeCityId: 'luoyang',
  },
  zhao_yun: {
    id: 'zhao_yun', name: '조운', hanja: '趙雲', factionAffinity: 'liu', role: '구조 · 호위 · 기동',
    summary: '패주 직전의 아군 라인을 살려내는 안정적인 기병 지휘관입니다.',
    quote: '퇴로는 남아 있습니다. 제가 지키겠습니다.',
    stats: { command: 93, martial: 95, intellect: 78, politics: 67, charm: 86 },
    aptitudes: { infantry: 'A', cavalry: 'S', archer: 'B' }, trait: 'rescue', traitName: '천리 구원',
    weakness: '구조가 반복되면 피로가 빠르게 누적되고 공성 화력은 낮습니다.', color: '#627d8c', accent: '#b85c52', homeCityId: 'chenliu',
  },
  xu_shu: {
    id: 'xu_shu', name: '서서', hanja: '徐庶', factionAffinity: 'liu', role: '책략 대응 · 탐색',
    summary: '적의 첫 책략을 약화하고 재야 인재의 관심사를 더 잘 읽습니다.',
    quote: '발자국은 거짓말을 하지 않습니다.',
    stats: { command: 82, martial: 68, intellect: 94, politics: 82, charm: 80 },
    aptitudes: { infantry: 'A', cavalry: 'B', archer: 'A' }, trait: 'counterplan', traitName: '즉응책',
    weakness: '혼자 전장을 뒤집는 폭발력은 낮고 개인 의리 사건에 민감합니다.', color: '#566c79', accent: '#aa805e', homeCityId: 'chenliu',
  },
  mi_zhu: {
    id: 'mi_zhu', name: '미축', hanja: '糜竺', factionAffinity: 'liu', role: '상업 · 보급 · 등용 지원',
    summary: '금과 군량, 인맥으로 작은 세력이 버틸 시간을 만들어 줍니다.',
    quote: '군량은 전장에 닿아야 비로소 군량입니다.',
    stats: { command: 55, martial: 32, intellect: 76, politics: 93, charm: 88 },
    aptitudes: { infantry: 'C', cavalry: 'C', archer: 'B' }, trait: 'supply', traitName: '상단 네트워크',
    weakness: '직접 전투와 순찰에 약하고 상업 도시를 잃으면 가치가 줄어듭니다.', color: '#776b4d', accent: '#6e9e8b', homeCityId: 'luoyang',
  },
};

const eventChoice = (
  id: string,
  label: string,
  description: string,
  result: string,
  effects: EventChoiceDefinition['effects'],
): EventChoiceDefinition => ({ id, label, description, result, effects });

export const STORY_EVENTS: StoryEventDefinition[] = [
  {
    id: 'refugees', title: '길 위의 유민', kicker: '민생 · 선택',
    intro: '전쟁을 피해 온 백성들이 성문 앞에 모였다. 창고는 넉넉하지 않지만 외면한다면 소문은 빠르게 퍼질 것이다.',
    choices: [
      eventChoice('open', '창고를 연다', '군량 -260 · 치안 +8 · 명성 +10', '군량은 줄었지만 백성들은 성문 안에서 다시 삶을 시작했다.', [
        { type: 'resource', resource: 'food', amount: -260 }, { type: 'city', city: 'capital', stat: 'order', amount: 8 }, { type: 'resource', resource: 'fame', amount: 10 },
      ]),
      eventChoice('settle', '개간지에 정착시킨다', '금 -140 · 농업 +4 · 치안 +3', '관리들이 땅을 나누고 새로운 촌락의 경계를 그었다.', [
        { type: 'resource', resource: 'gold', amount: -140 }, { type: 'city', city: 'capital', stat: 'agriculture', amount: 4 }, { type: 'city', city: 'capital', stat: 'order', amount: 3 },
      ]),
      eventChoice('refuse', '국경 밖으로 돌려보낸다', '명성 -8 · 치안 -3', '창고는 지켰지만 닫힌 성문에 대한 이야기도 함께 남았다.', [
        { type: 'resource', resource: 'fame', amount: -8 }, { type: 'city', city: 'capital', stat: 'order', amount: -3 },
      ]),
    ],
  },
  {
    id: 'horse_merchants', title: '북방의 군마', kicker: '상업 · 군비',
    intro: '상단이 튼튼한 군마를 끌고 왔다. 값은 비싸지만 다음 원정의 속도를 바꿀 수 있다.',
    choices: [
      eventChoice('buy', '군마를 사들인다', '금 -240 · 수도 병력 +700', '말과 마구가 군영에 들어오며 병사들의 눈빛도 달라졌다.', [
        { type: 'resource', resource: 'gold', amount: -240 }, { type: 'city', city: 'capital', stat: 'troops', amount: 700 },
      ]),
      eventChoice('trade', '교역 허가만 내준다', '금 +160 · 상업 +2', '상인들은 다른 도시로 향했고 세금과 소문이 남았다.', [
        { type: 'resource', resource: 'gold', amount: 160 }, { type: 'city', city: 'capital', stat: 'commerce', amount: 2 },
      ]),
    ],
  },
  {
    id: 'merit_dispute', title: '전공을 둘러싼 언쟁', kicker: '장수 · 관계',
    intro: '두 장수가 같은 공을 자신의 것이라 주장했다. 논공행상이 늦어지자 군영의 분위기도 날카로워졌다.',
    choices: [
      eventChoice('share', '공을 나누어 포상한다', '금 -180 · 전체 충성 +3', '두 장수 모두 완전히 만족하지는 않았지만 군영은 다시 움직였다.', [
        { type: 'resource', resource: 'gold', amount: -180 }, { type: 'loyalty', target: 'all', amount: 3 },
      ]),
      eventChoice('merit', '공적이 높은 장수를 세운다', '금 -100 · 최저 충성 장수 -2 · 명성 +5', '기준은 분명해졌으나 마음에 남은 앙금도 분명했다.', [
        { type: 'resource', resource: 'gold', amount: -100 }, { type: 'loyalty', target: 'lowest', amount: -2 }, { type: 'resource', resource: 'fame', amount: 5 },
      ]),
    ],
  },
  {
    id: 'good_harvest', title: '예상 밖의 풍년', kicker: '도시 · 결산',
    intro: '늦은 비가 들판을 살렸다. 창고를 채울지, 시장에 풀어 금을 마련할지 결정해야 한다.',
    choices: [
      eventChoice('store', '군량을 저장한다', '군량 +380', '새 곡식이 창고의 빈 칸을 채웠다.', [{ type: 'resource', resource: 'food', amount: 380 }]),
      eventChoice('sell', '절반을 시장에 푼다', '금 +220 · 군량 +120', '시장에는 활기가 돌고 창고에도 최소한의 여유가 남았다.', [
        { type: 'resource', resource: 'gold', amount: 220 }, { type: 'resource', resource: 'food', amount: 120 },
      ]),
    ],
  },
  {
    id: 'drought', title: '메마른 논', kicker: '재난 · 민심',
    intro: '비가 끊기고 농민들이 관청 앞에 모였다. 다음 수입까지 버티려면 지금 손실을 감수해야 한다.',
    choices: [
      eventChoice('relief', '구휼미를 푼다', '군량 -230 · 치안 +7 · 명성 +8', '관청의 솥에서 연기가 오르자 소란도 잦아들었다.', [
        { type: 'resource', resource: 'food', amount: -230 }, { type: 'city', city: 'capital', stat: 'order', amount: 7 }, { type: 'resource', resource: 'fame', amount: 8 },
      ]),
      eventChoice('ration', '배급을 엄격히 제한한다', '군량 +80 · 치안 -5', '창고는 버텼지만 병사와 백성의 표정이 함께 굳었다.', [
        { type: 'resource', resource: 'food', amount: 80 }, { type: 'city', city: 'capital', stat: 'order', amount: -5 },
      ]),
    ],
  },
  {
    id: 'imperial_edict', title: '빛바랜 황실 조서', kicker: '명분 · 외교',
    intro: '오래된 조서가 발견되었다. 진위를 완전히 확인할 수는 없지만 공개한다면 명분을 얻을 수도 있다.',
    choices: [
      eventChoice('honor', '예를 갖춰 봉안한다', '금 -100 · 명성 +18', '조서는 조정에 봉안되었고 사절들은 당신의 태도를 기록했다.', [
        { type: 'resource', resource: 'gold', amount: -100 }, { type: 'resource', resource: 'fame', amount: 18 },
      ]),
      eventChoice('archive', '기록만 남기고 보관한다', '명성 +4 · 정치적 위험 없음', '조서는 조용히 봉인되었고 훗날을 위한 기록만 남았다.', [{ type: 'resource', resource: 'fame', amount: 4 }]),
    ],
  },
  {
    id: 'wandering_scholar', title: '비를 피한 선비', kicker: '인재 · 탐색',
    intro: '한 선비가 관청 처마에서 비를 피하고 있다. 말은 아끼지만 지역 인재들의 소문을 꽤 많이 아는 듯하다.',
    choices: [
      eventChoice('invite', '안으로 초대한다', '금 -70 · 숨은 인재 접촉 +1', '따뜻한 차 한 잔 뒤에 아직 만나지 못한 이름 하나가 나왔다.', [
        { type: 'resource', resource: 'gold', amount: -70 }, { type: 'contact', target: 'randomHidden', amount: 1 },
      ]),
      eventChoice('ask', '길만 묻고 보낸다', '명성 +2', '짧은 대화였지만 예를 지켰다는 소문은 남았다.', [{ type: 'resource', resource: 'fame', amount: 2 }]),
    ],
  },
  {
    id: 'wounded_veterans', title: '돌아온 부상병', kicker: '군영 · 회복',
    intro: '이전 전투의 부상병들이 돌아왔다. 쉬게 하면 전열 복귀가 늦고, 당장 편성하면 사기가 흔들릴 수 있다.',
    choices: [
      eventChoice('rest', '충분히 쉬게 한다', '전체 피로 -14 · 군량 -100', '군영은 조용했지만 다음 훈련에는 익숙한 얼굴들이 다시 섰다.', [
        { type: 'fatigue', target: 'all', amount: -14 }, { type: 'resource', resource: 'food', amount: -100 },
      ]),
      eventChoice('return', '경계 임무부터 맡긴다', '수도 병력 +350 · 전체 피로 +5', '병력은 늘었지만 오래 버틴 장수들의 어깨가 더 무거워졌다.', [
        { type: 'city', city: 'capital', stat: 'troops', amount: 350 }, { type: 'fatigue', target: 'all', amount: 5 },
      ]),
    ],
  },
  {
    id: 'border_smoke', title: '국경의 봉화', kicker: '군사 · 경고',
    intro: '진류 방면에서 봉화가 올랐다. 적의 정찰일 수도, 상인들의 소란일 수도 있다.',
    choices: [
      eventChoice('reinforce', '수비대를 보낸다', '군량 -150 · 선택 도시 병력 +500', '성문 위의 깃발이 늘고 병사들은 교대 시간을 다시 맞췄다.', [
        { type: 'resource', resource: 'food', amount: -150 }, { type: 'city', city: 'capital', stat: 'troops', amount: 500 },
      ]),
      eventChoice('scout', '소수 정찰대만 보낸다', '금 -60 · 명성 +3 · 최저 충성 +1', '큰 소동은 피했고 장수들은 신중한 대응을 높이 샀다.', [
        { type: 'resource', resource: 'gold', amount: -60 }, { type: 'resource', resource: 'fame', amount: 3 }, { type: 'loyalty', target: 'lowest', amount: 1 },
      ]),
    ],
  },
  {
    id: 'sealed_letter', title: '봉인이 뜯긴 서신', kicker: '대체 역사 · 선택',
    intro: '적 장수에게 보내진 듯한 서신이 중간에서 발견되었다. 돌려보내 신뢰를 살릴 수도, 내용을 이용해 흔들 수도 있다.',
    choices: [
      eventChoice('return', '봉인해 돌려보낸다', '명성 +12 · 전체 충성 +2', '서신은 다시 봉인되었고 뜻밖의 예의는 양쪽 군영에 오래 남았다.', [
        { type: 'resource', resource: 'fame', amount: 12 }, { type: 'loyalty', target: 'all', amount: 2 },
      ]),
      eventChoice('use', '내용을 선전한다', '금 +100 · 명성 -7 · 최저 충성 -2', '당장의 혼란은 이익이 되었지만 당신의 장수들도 봉인을 다시 확인했다.', [
        { type: 'resource', resource: 'gold', amount: 100 }, { type: 'resource', resource: 'fame', amount: -7 }, { type: 'loyalty', target: 'lowest', amount: -2 },
      ]),
    ],
  },
];

export const TROOP_LABELS: Record<TroopType, string> = {
  infantry: '보병', cavalry: '기병', archer: '궁병',
};

export const TROOP_ICONS: Record<TroopType, string> = {
  infantry: '盾', cavalry: '馬', archer: '弓',
};

export const FORMATION_LABELS: Record<Formation, string> = {
  arrow: '어린진', circle: '방원진',
};

export const TACTIC_LABELS: Record<Tactic, string> = {
  none: '무책', inspire: '고무',
};

export const APTITUDE_VALUE = { S: 1.16, A: 1.08, B: 1, C: 0.9 } as const;

export function officerIdsForFaction(factionId: Exclude<FactionId, 'neutral'>): OfficerId[] {
  return (Object.values(OFFICERS) as OfficerDefinition[])
    .filter((officer) => officer.factionAffinity === factionId)
    .map((officer) => officer.id);
}

export function factionName(id: FactionId): string {
  return id === 'neutral' ? '중립군' : FACTIONS[id].name;
}
