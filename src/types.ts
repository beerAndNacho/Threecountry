export type FactionId = 'cao' | 'liu' | 'neutral';
export type CityId = 'xuchang' | 'chenliu' | 'luoyang';
export type OfficerId =
  | 'cao_cao'
  | 'xiahou_dun'
  | 'dian_wei'
  | 'xun_yu'
  | 'guo_jia'
  | 'xu_chu'
  | 'liu_bei'
  | 'guan_yu'
  | 'zhang_fei'
  | 'zhao_yun'
  | 'xu_shu'
  | 'mi_zhu';

export type TroopType = 'infantry' | 'cavalry' | 'archer';
export type Formation = 'arrow' | 'circle';
export type Tactic = 'none' | 'inspire';
export type Season = '봄' | '여름' | '가을' | '겨울';
export type GameStatus = 'playing' | 'victory' | 'defeat';
export type OfficerStatus = 'active' | 'hidden' | 'candidate' | 'captured';

export interface Stats {
  command: number;
  martial: number;
  intellect: number;
  politics: number;
  charm: number;
}

export interface Aptitudes {
  infantry: 'S' | 'A' | 'B' | 'C';
  cavalry: 'S' | 'A' | 'B' | 'C';
  archer: 'S' | 'A' | 'B' | 'C';
}

export interface OfficerDefinition {
  id: OfficerId;
  name: string;
  hanja: string;
  factionAffinity: Exclude<FactionId, 'neutral'>;
  role: string;
  summary: string;
  quote: string;
  stats: Stats;
  aptitudes: Aptitudes;
  trait: string;
  traitName: string;
  weakness: string;
  color: string;
  accent: string;
  homeCityId: CityId;
}

export interface OfficerState {
  id: OfficerId;
  factionId: Exclude<FactionId, 'neutral'> | null;
  status: OfficerStatus;
  cityId: CityId;
  loyalty: number;
  fatigue: number;
  merit: number;
  contact: number;
}

export interface CityDefinition {
  id: CityId;
  name: string;
  hanja: string;
  subtitle: string;
  x: number;
  y: number;
  neighbors: CityId[];
}

export interface CityState {
  id: CityId;
  ownerId: FactionId;
  agriculture: number;
  commerce: number;
  order: number;
  wall: number;
  troops: number;
  food: number;
  governorId: OfficerId | null;
}

export interface FactionDefinition {
  id: Exclude<FactionId, 'neutral'>;
  name: string;
  lordId: OfficerId;
  capitalId: CityId;
  motto: string;
  strength: string;
  risk: string;
  color: string;
  pale: string;
}

export interface FactionState {
  id: Exclude<FactionId, 'neutral'>;
  gold: number;
  food: number;
  fame: number;
  alive: boolean;
}

export interface ChronicleEntry {
  id: string;
  turn: number;
  season: Season;
  category: 'system' | 'domestic' | 'officer' | 'battle' | 'event' | 'warning';
  title: string;
  body: string;
  importance: 1 | 2 | 3 | 4 | 5;
}

export type Effect =
  | { type: 'resource'; resource: 'gold' | 'food' | 'fame'; amount: number }
  | { type: 'city'; city: 'capital' | CityId; stat: 'agriculture' | 'commerce' | 'order' | 'wall' | 'troops' | 'food'; amount: number }
  | { type: 'loyalty'; target: 'all' | 'lowest' | OfficerId; amount: number }
  | { type: 'fatigue'; target: 'all' | 'highest' | OfficerId; amount: number }
  | { type: 'contact'; target: 'randomHidden'; amount: number };

export interface EventChoiceDefinition {
  id: string;
  label: string;
  description: string;
  effects: Effect[];
  result: string;
}

export interface StoryEventDefinition {
  id: string;
  title: string;
  kicker: string;
  intro: string;
  choices: EventChoiceDefinition[];
}

export interface BattleLineDraft {
  officerId: OfficerId;
  troopType: TroopType;
}

export interface BattleDraft {
  sourceCityId: CityId;
  targetCityId: CityId;
  committedTroops: number;
  formation: Formation;
  tactic: Tactic;
  lines: BattleLineDraft[];
}

export interface BattleLineSnapshot {
  name: string;
  officerId: OfficerId | null;
  troopType: TroopType;
  troops: number;
  maxTroops: number;
  morale: number;
  stats: Stats;
  trait: string | null;
  routed: boolean;
}

export interface BattleRoundLog {
  round: number;
  text: string;
  tone: 'neutral' | 'good' | 'bad' | 'special';
}

export interface BattleResult {
  attackerWon: boolean;
  attackerRemaining: number;
  defenderRemaining: number;
  attackerLosses: number;
  defenderLosses: number;
  logs: BattleRoundLog[];
  headline: string;
  factors: string[];
  standout: string;
  targetCityId: CityId;
  sourceCityId: CityId;
  attackerFactionId: Exclude<FactionId, 'neutral'>;
  defenderFactionId: FactionId;
  committedTroops: number;
  attackerOfficerIds: OfficerId[];
}

export interface GameState {
  saveVersion: 1;
  campaignId: string;
  seed: string;
  rngCursor: number;
  turn: number;
  season: Season;
  status: GameStatus;
  playerFactionId: Exclude<FactionId, 'neutral'>;
  enemyFactionId: Exclude<FactionId, 'neutral'>;
  actionPoints: number;
  selectedCityId: CityId;
  factions: Record<Exclude<FactionId, 'neutral'>, FactionState>;
  cities: Record<CityId, CityState>;
  officers: Record<OfficerId, OfficerState>;
  usedEventIds: string[];
  pendingEventId: string | null;
  chronicle: ChronicleEntry[];
  lastBattle: BattleResult | null;
  onboardingStep: number;
}

export interface ActionResult {
  ok: boolean;
  state: GameState;
  message: string;
}
