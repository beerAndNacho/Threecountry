import {
  CITY_DEFINITIONS,
  FACTIONS,
  FORMATION_LABELS,
  OFFICERS,
  TACTIC_LABELS,
  TROOP_ICONS,
  TROOP_LABELS,
  factionName,
} from './content.js';
import {
  VERTICAL_MAX_TURN,
  activeOfficers,
  assignGovernor,
  attackCity,
  battleFoodCost,
  campaignScore,
  candidatesForFaction,
  cityActionPreviews,
  connectedTargets,
  createNewGame,
  defaultBattleDraft,
  endTurn,
  factionCities,
  invariantErrors,
  pendingEvent,
  performCityAction,
  recommendedHint,
  recruitCandidate,
  recruitChance,
  resolveEventChoice,
} from './engine.js';
import { clearGame, loadGame, saveGame } from './storage.js';
import type {
  ActionResult,
  BattleDraft,
  BattleResult,
  CityId,
  CityState,
  FactionId,
  Formation,
  GameState,
  OfficerDefinition,
  OfficerId,
  OfficerState,
  Tactic,
  TroopType,
} from './types.js';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('App root not found');
const app: HTMLDivElement = appElement;

type View = 'map' | 'court' | 'army' | 'chronicle';
type Screen = 'title' | 'game';

let savedGame: GameState | null = null;
let game: GameState | null = null;
let screen: Screen = 'title';
let view: View = 'map';
let selectedFaction: 'cao' | 'liu' = 'cao';
let selectedCityId: CityId = 'xuchang';
let battleDraft: BattleDraft | null = null;
let battleReportOpen = false;
let aiThinking = false;
let saveStatus = '저장 준비';
let toastTimer: number | null = null;
let audioContext: AudioContext | null = null;
let soundEnabled = true;
let helpOpen = false;

try { soundEnabled = localStorage.getItem('threecountry:sound') !== 'off'; } catch {}

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] ?? character));
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('ko-KR');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAudioContext(): AudioContext | null {
  if (!soundEnabled) return null;
  const AudioConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioConstructor) return null;
  if (!audioContext) audioContext = new AudioConstructor();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(frequency: number, delay = 0, duration = 0.07, gain = 0.025, type: OscillatorType = 'sine'): void {
  const context = getAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSound(name: 'tap' | 'action' | 'success' | 'failure' | 'battle' | 'event' | 'victory'): void {
  if (!soundEnabled) return;
  if (name === 'tap') tone(430, 0, 0.04, 0.014, 'triangle');
  if (name === 'action') { tone(330, 0, 0.06, 0.02, 'triangle'); tone(510, 0.04, 0.07, 0.018, 'triangle'); }
  if (name === 'success') { tone(620, 0, 0.08, 0.026); tone(820, 0.06, 0.12, 0.024); }
  if (name === 'failure') { tone(260, 0, 0.08, 0.022, 'triangle'); tone(190, 0.07, 0.12, 0.018, 'triangle'); }
  if (name === 'battle') { tone(130, 0, 0.11, 0.04, 'square'); tone(160, 0.11, 0.12, 0.035, 'square'); }
  if (name === 'event') { tone(480, 0, 0.08, 0.02, 'sine'); tone(720, 0.08, 0.12, 0.018, 'sine'); }
  if (name === 'victory') [392, 523, 659, 784].forEach((frequency, index) => tone(frequency, index * 0.08, 0.17, 0.028, 'triangle'));
}

function showToast(message: string, toneName: 'neutral' | 'good' | 'bad' = 'neutral'): void {
  const existing = document.querySelector<HTMLElement>('#toast');
  if (!existing) return;
  existing.textContent = message;
  existing.dataset.tone = toneName;
  existing.classList.add('show');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => existing.classList.remove('show'), 2300);
}

async function persist(): Promise<void> {
  if (!game) return;
  saveStatus = '저장 중…';
  updateSaveIndicator();
  try {
    await saveGame(game);
    savedGame = game;
    saveStatus = '자동 저장됨';
  } catch {
    saveStatus = '저장 확인 필요';
  }
  updateSaveIndicator();
}

function updateSaveIndicator(): void {
  const element = document.querySelector<HTMLElement>('#saveIndicator');
  if (element) element.textContent = saveStatus;
}

function commit(result: ActionResult, options: { battle?: boolean; sound?: 'action' | 'success' | 'failure' | 'event' } = {}): void {
  if (!result.ok) {
    playSound('failure');
    showToast(result.message, 'bad');
    return;
  }
  game = result.state;
  selectedCityId = game.selectedCityId;
  battleReportOpen = Boolean(options.battle && game.lastBattle);
  playSound(options.sound ?? 'action');
  render();
  showToast(result.message, 'good');
  void persist();
}

function factionCrest(id: FactionId): string {
  if (id === 'cao') return '曹';
  if (id === 'liu') return '劉';
  return '野';
}

function factionColor(id: FactionId): string {
  if (id === 'neutral') return '#8b8173';
  return FACTIONS[id].color;
}

function officerPortrait(officer: OfficerDefinition, size: 'small' | 'normal' | 'large' = 'normal'): string {
  const symbol = officer.hanja.slice(0, 1);
  const roleSymbol = officer.role.includes('책') || officer.role.includes('예측') || officer.role.includes('경제') || officer.role.includes('상업') ? '卷'
    : officer.role.includes('호위') || officer.role.includes('방어') ? '盾'
      : officer.role.includes('기동') || officer.role.includes('추격') ? '馬' : '槍';
  return `<div class="officer-portrait ${size}" style="--portrait:${officer.color};--portrait-accent:${officer.accent}" aria-hidden="true">
    <span class="portrait-halo"></span><span class="portrait-ear left"></span><span class="portrait-ear right"></span>
    <span class="portrait-face"><i></i><i></i><b>${escapeHtml(symbol)}</b></span>
    <span class="portrait-body"></span><em>${roleSymbol}</em>
  </div>`;
}

function statMini(officer: OfficerDefinition): string {
  const stats = [
    ['통', officer.stats.command], ['무', officer.stats.martial], ['지', officer.stats.intellect],
    ['정', officer.stats.politics], ['매', officer.stats.charm],
  ];
  return `<div class="stat-mini">${stats.map(([label, value]) => `<span><i>${label}</i><b>${value}</b></span>`).join('')}</div>`;
}

function statusPill(label: string, value: number, toneName: 'green' | 'amber' | 'red' | 'blue'): string {
  return `<span class="meter-pill ${toneName}"><small>${label}</small><b>${Math.round(value)}</b></span>`;
}

function renderTitle(): string {
  const saved = savedGame;
  return `<div class="title-screen">
    <div class="title-noise"></div>
    <header class="title-topbar">
      <div class="brand-lockup"><span class="seal">天</span><div><b>천하일지</b><small>군웅의 계절</small></div></div>
      <div class="title-actions">
        <button class="round-button" data-action="toggle-sound" type="button" aria-label="효과음 켜기 또는 끄기">${soundEnabled ? '音' : '靜'}</button>
        <button class="round-button" data-action="toggle-help" type="button" aria-label="게임 설명">?</button>
      </div>
    </header>

    <main class="title-main">
      <section class="title-copy">
        <span class="title-kicker">THREE CITIES · TWELVE OFFICERS</span>
        <h1>한 계절,<br><em>세 번의 선택.</em></h1>
        <p>허창·진류·낙양을 다스리고 인재를 얻으십시오. 좌·중·우 세 전선의 병종과 진형을 맞춰 상대 수도의 깃발을 내리면 첫 연대기가 완성됩니다.</p>
        <div class="title-buttons">
          ${saved ? `<button class="primary-ink" data-action="continue-game" type="button"><span>이어하기</span><small>${saved.turn}턴 ${saved.season} · ${FACTIONS[saved.playerFactionId].name}</small><b>→</b></button>` : ''}
          <button class="paper-button" data-action="scroll-new" type="button">새 연대기 선택</button>
        </div>
        <div class="title-promises"><span>⌛ 한 턴 3~7분</span><span>⚔ 결정적 3라인 전투</span><span>▣ 서버·AI 비용 0원</span></div>
      </section>

      <section class="title-diorama" aria-label="허창 진류 낙양의 미니어처 지도">
        <div class="moon-disc"></div><div class="ink-mountain m1"></div><div class="ink-mountain m2"></div>
        <div class="title-road"></div>
        ${(['xuchang', 'chenliu', 'luoyang'] as CityId[]).map((id, index) => {
          const city = CITY_DEFINITIONS[id];
          return `<div class="title-city c${index + 1}"><i>${city.hanja}</i><b>${city.name}</b><span></span></div>`;
        }).join('')}
        <div class="lord-pair">
          <div class="title-lord cao">${officerPortrait(OFFICERS.cao_cao, 'large')}<b>조조</b></div>
          <div class="versus-mark">對</div>
          <div class="title-lord liu">${officerPortrait(OFFICERS.liu_bei, 'large')}<b>유비</b></div>
        </div>
      </section>
    </main>

    <section class="lord-select" id="newChronicle">
      <div class="section-heading"><span>NEW CHRONICLE</span><h2>누구의 깃발을 들까요?</h2><p>첫 수직 슬라이스에서는 조조와 유비의 운영 방식이 완전히 다르게 느껴지도록 설계했습니다.</p></div>
      <div class="lord-grid">
        ${(['cao', 'liu'] as const).map((id) => {
          const faction = FACTIONS[id];
          const lord = OFFICERS[faction.lordId];
          const selected = selectedFaction === id;
          return `<button class="lord-card ${selected ? 'selected' : ''}" data-action="select-faction" data-faction="${id}" type="button">
            <span class="lord-check">${selected ? '✓' : ''}</span>
            ${officerPortrait(lord, 'large')}
            <div class="lord-card-copy"><small>${faction.name}</small><h3>${lord.name} <i>${lord.hanja}</i></h3><p>${faction.motto}</p>
              <dl><div><dt>강점</dt><dd>${faction.strength}</dd></div><div><dt>주의</dt><dd>${faction.risk}</dd></div></dl>
            </div>
          </button>`;
        }).join('')}
      </div>
      <div class="start-panel"><div><span>목표</span><b>진류를 확보하고 상대 수도를 점령</b><small>최대 ${VERTICAL_MAX_TURN}턴 · 자동 저장 · 같은 시드는 같은 결과</small></div><button class="start-button" data-action="start-game" type="button">연대기를 시작한다 <b>→</b></button></div>
    </section>

    <footer class="title-footer"><span>독자적인 먹선 미니어처 디자인</span><span>외부 이미지·음원·생성형 AI 미사용</span></footer>
    ${helpOpen ? renderHelpModal() : ''}
    <div class="toast" id="toast" role="status"></div>
  </div>`;
}

function renderHelpModal(): string {
  return `<div class="modal-backdrop" data-action="close-help"><section class="modal-card help-modal" role="dialog" aria-modal="true" aria-label="게임 설명" data-stop-close>
    <button class="modal-close" data-action="close-help" type="button">×</button>
    <span class="eyebrow">HOW TO PLAY</span><h2>첫 연대기의 흐름</h2>
    <div class="help-steps"><article><b>1</b><div><h3>행동점 3개</h3><p>개간·순찰·징병·탐색 중 지금 가장 중요한 일을 고릅니다.</p></div></article><article><b>2</b><div><h3>인재와 도시</h3><p>숨은 장수를 찾아 등용하고, 장수의 위치·충성·피로를 함께 관리합니다.</p></div></article><article><b>3</b><div><h3>3라인 전투</h3><p>좌·중·우에 서로 다른 장수와 병종을 놓고 진형·책략을 선택합니다.</p></div></article><article><b>4</b><div><h3>상대 수도 점령</h3><p>진류를 거쳐 허창 또는 낙양을 점령하면 승리합니다.</p></div></article></div>
    <p class="help-note">게임 결과는 시드 기반으로 재현되며, 외부 AI API나 서버 비용은 발생하지 않습니다.</p>
  </section></div>`;
}

function renderCampaignHeader(state: GameState): string {
  const faction = state.factions[state.playerFactionId];
  return `<header class="campaign-header">
    <button class="campaign-brand" data-action="back-title" type="button"><span>${factionCrest(state.playerFactionId)}</span><div><b>천하일지</b><small>${FACTIONS[state.playerFactionId].name}</small></div></button>
    <div class="turn-block"><small>군웅력 ${state.turn}턴</small><b>${state.season}</b><span>행동 <em>${state.actionPoints}</em>/3</span></div>
    <div class="resource-row">
      <button class="resource-chip" data-resource="gold" type="button"><i>錢</i><span>금</span><b>${formatNumber(faction.gold)}</b></button>
      <button class="resource-chip" data-resource="food" type="button"><i>穀</i><span>군량</span><b>${formatNumber(faction.food)}</b></button>
      <button class="resource-chip" data-resource="fame" type="button"><i>名</i><span>명성</span><b>${formatNumber(faction.fame)}</b></button>
    </div>
    <div class="header-actions"><span id="saveIndicator">${saveStatus}</span><button class="round-button" data-action="toggle-sound" type="button">${soundEnabled ? '音' : '靜'}</button><button class="round-button" data-action="toggle-help" type="button">?</button></div>
  </header>`;
}

function renderBottomNav(): string {
  const entries: { id: View; icon: string; label: string }[] = [
    { id: 'map', icon: '圖', label: '지도' }, { id: 'court', icon: '人', label: '조정' },
    { id: 'army', icon: '軍', label: '군단' }, { id: 'chronicle', icon: '卷', label: '연대기' },
  ];
  return `<nav class="bottom-nav" aria-label="캠페인 메뉴">${entries.map((entry) => `<button class="${view === entry.id ? 'active' : ''}" data-action="nav" data-view="${entry.id}" type="button"><span>${entry.icon}</span><b>${entry.label}</b></button>`).join('')}</nav>`;
}

function cityOfficerChips(state: GameState, cityId: CityId): string {
  const officers = activeOfficers(state, state.cities[cityId].ownerId === 'neutral' ? state.playerFactionId : state.cities[cityId].ownerId as 'cao' | 'liu', cityId);
  if (!officers.length) return '<span class="empty-chip">상주 장수 없음</span>';
  return officers.map((officer) => `<span class="officer-chip" style="--chip:${OFFICERS[officer.id].color}">${officerPortrait(OFFICERS[officer.id], 'small')}<b>${OFFICERS[officer.id].name}</b></span>`).join('');
}

function renderMap(state: GameState): string {
  const selected = state.cities[selectedCityId];
  const hint = recommendedHint(state);
  return `<section class="map-view">
    <div class="coach-strip"><span>軍師</span><p>${escapeHtml(hint)}</p><button data-action="nav" data-view="chronicle" type="button">목표 보기</button></div>
    <div class="map-layout">
      <div class="strategy-map">
        <div class="map-title"><div><span>THREE-CITY FRONT</span><h2>중원 삼도</h2></div><div class="map-legend"><span><i style="background:${FACTIONS.cao.color}"></i>조조군</span><span><i style="background:${FACTIONS.liu.color}"></i>유비군</span><span><i style="background:#8b8173"></i>중립</span></div></div>
        <div class="map-canvas">
          <svg viewBox="0 0 100 78" aria-hidden="true"><defs><linearGradient id="paperMap" x1="0" x2="1"><stop offset="0" stop-color="#e7d7bb"/><stop offset=".5" stop-color="#f1e5cd"/><stop offset="1" stop-color="#dfceb0"/></linearGradient></defs><rect width="100" height="78" rx="4" fill="url(#paperMap)"/><path d="M0 17 C18 8, 28 24, 45 13 S73 9, 100 20" fill="none" stroke="rgba(53,87,111,.23)" stroke-width="4"/><path d="M0 60 C21 49, 27 71, 48 58 S76 49, 100 63" fill="none" stroke="rgba(78,129,116,.14)" stroke-width="9"/><path d="M16 62 Q32 43 50 38 Q68 43 84 62" fill="none" stroke="rgba(32,36,35,.35)" stroke-width="1.3" stroke-dasharray="2 1"/><path d="M5 75 L22 44 L38 75 M55 75 L70 49 L91 75" fill="rgba(80,80,72,.07)" stroke="rgba(50,50,45,.12)" stroke-width=".7"/></svg>
          ${(Object.values(CITY_DEFINITIONS)).map((definition) => {
            const city = state.cities[definition.id];
            const selectedClass = selectedCityId === definition.id ? 'selected' : '';
            const danger = city.ownerId === state.playerFactionId && connectedTargets(state, city.id).some((target) => target.ownerId === state.enemyFactionId);
            return `<button class="city-node ${selectedClass}" data-action="select-city" data-city="${definition.id}" type="button" style="left:${definition.x}%;top:${definition.y}%;--faction:${factionColor(city.ownerId)}">
              ${danger ? '<span class="danger-ping">!</span>' : ''}<i>${factionCrest(city.ownerId)}</i><b>${definition.name}</b><small>${formatNumber(city.troops)}</small><em>${definition.hanja}</em>
            </button>`;
          }).join('')}
          <div class="map-objective"><span>최종 목표</span><b>${CITY_DEFINITIONS[FACTIONS[state.enemyFactionId].capitalId].name} 점령</b></div>
        </div>
        <div class="map-summary">${(Object.values(state.cities) as CityState[]).map((city) => `<button data-action="select-city" data-city="${city.id}" class="${selectedCityId === city.id ? 'active' : ''}" type="button"><i style="background:${factionColor(city.ownerId)}"></i><span>${CITY_DEFINITIONS[city.id].name}</span><b>${formatNumber(city.troops)}</b><small>성벽 ${city.wall}</small></button>`).join('')}</div>
      </div>
      ${renderCityPanel(state, selected)}
    </div>
  </section>`;
}

function renderCityPanel(state: GameState, city: CityState): string {
  const definition = CITY_DEFINITIONS[city.id];
  const own = city.ownerId === state.playerFactionId;
  const governor = city.governorId ? OFFICERS[city.governorId] : null;
  const previews = own ? cityActionPreviews(state, city.id) : [];
  const possibleSources = factionCities(state, state.playerFactionId)
    .filter((source) => CITY_DEFINITIONS[source.id].neighbors.includes(city.id));
  return `<aside class="city-panel">
    <div class="city-panel-head" style="--owner:${factionColor(city.ownerId)}"><div><span>${definition.hanja}</span><div><small>${factionName(city.ownerId)}</small><h2>${definition.name}</h2><p>${definition.subtitle}</p></div></div><b>${city.ownerId === 'neutral' ? '중립' : '지배'}</b></div>
    <div class="city-stat-grid">
      ${[['農', '농업', city.agriculture], ['商', '상업', city.commerce], ['安', '치안', city.order], ['壁', '성벽', city.wall]].map(([icon, label, value]) => `<article><i>${icon}</i><div><span>${label}</span><b>${value}</b><em><u style="width:${value}%"></u></em></div></article>`).join('')}
    </div>
    <div class="city-military"><article><span>주둔 병력</span><b>${formatNumber(city.troops)}</b></article><article><span>도시 군량</span><b>${formatNumber(city.food)}</b></article><article><span>태수</span><b>${governor?.name ?? '공석'}</b></article></div>
    <div class="city-officers"><span>현재 장수</span><div>${cityOfficerChips(state, city.id)}</div></div>
    ${own ? `<div class="city-actions"><div class="panel-label"><span>이번 계절 행동</span><b>행동점 ${state.actionPoints}</b></div>${previews.map((preview) => `<button class="city-action-card" data-action="city-action" data-city="${city.id}" data-city-action="${preview.id}" type="button" ${preview.enabled ? '' : 'disabled'}><div><b>${preview.label}</b><p>${preview.description}</p><small>${preview.cost}</small></div><span>${preview.enabled ? '→' : '×'}</span>${preview.reason ? `<em>${preview.reason}</em>` : ''}</button>`).join('')}</div>` : `<div class="hostile-panel"><span>${city.ownerId === 'neutral' ? '아직 어느 깃발도 오르지 않았습니다.' : '상대 세력의 도시입니다.'}</span><p>인접한 우리 도시에서 장수 3명과 최소 2,400명의 병력을 준비하면 공격할 수 있습니다.</p>${possibleSources.map((source) => `<button data-action="open-battle" data-source="${source.id}" data-target="${city.id}" type="button">${CITY_DEFINITIONS[source.id].name}에서 출전 준비 <b>→</b></button>`).join('') || '<small>현재 연결된 우리 도시가 없습니다.</small>'}</div>`}
  </aside>`;
}

function officerLocation(state: GameState, officer: OfficerState): string {
  if (officer.status === 'captured') return '포로';
  return CITY_DEFINITIONS[officer.cityId].name;
}

function renderOfficerCard(state: GameState, officerState: OfficerState): string {
  const officer = OFFICERS[officerState.id];
  const governorCity = (Object.values(state.cities) as CityState[]).find((city) => city.governorId === officer.id);
  const canGovernor = state.status === 'playing'
    && !state.pendingEventId
    && state.actionPoints > 0
    && officerState.cityId === selectedCityId
    && state.cities[selectedCityId].ownerId === state.playerFactionId
    && state.cities[selectedCityId].governorId !== officer.id;
  return `<article class="officer-card">
    <div class="officer-card-top">${officerPortrait(officer)}<div><span>${escapeHtml(officer.role)}</span><h3>${officer.name} <small>${officer.hanja}</small></h3><p>${officer.summary}</p></div></div>
    ${statMini(officer)}
    <div class="trait-box"><span>${officer.traitName}</span><p>${officer.weakness}</p></div>
    <div class="officer-state-row">${statusPill('충성', officerState.loyalty, officerState.loyalty >= 75 ? 'green' : officerState.loyalty >= 45 ? 'amber' : 'red')}${statusPill('피로', officerState.fatigue, officerState.fatigue < 45 ? 'blue' : officerState.fatigue < 75 ? 'amber' : 'red')}<span class="location-pill">${officerLocation(state, officerState)}</span></div>
    <blockquote>“${officer.quote}”</blockquote>
    <footer><span>${governorCity ? `${CITY_DEFINITIONS[governorCity.id].name} 태수` : `공적 ${officerState.merit}`}</span>${canGovernor ? `<button data-action="assign-governor" data-officer="${officer.id}" data-city="${selectedCityId}" type="button">${CITY_DEFINITIONS[selectedCityId].name} 태수 임명</button>` : ''}</footer>
  </article>`;
}

function renderCourt(state: GameState): string {
  const officers = activeOfficers(state, state.playerFactionId);
  const candidates = candidatesForFaction(state, state.playerFactionId);
  return `<section class="content-view court-view">
    <div class="page-heading"><div><span>COURT & OFFICERS</span><h1>조정과 장수</h1><p>능력치가 높은 장수만 모으는 것보다 위치·충성·피로와 고유 역할을 맞추는 것이 중요합니다.</p></div><div class="heading-stat"><small>활동 장수</small><b>${officers.length}</b><span>접촉 인재 ${candidates.length}</span></div></div>
    ${candidates.length ? `<section class="candidate-section"><div class="section-title"><span>등용을 기다리는 인재</span><small>행동점 1 · 금 120</small></div><div class="candidate-grid">${candidates.map((candidate) => {
      const officer = OFFICERS[candidate.id];
      const chance = recruitChance(state, candidate.id);
      const canRecruit = state.actionPoints > 0 && state.factions[state.playerFactionId].gold >= 120 && !state.pendingEventId;
      return `<article class="candidate-card">${officerPortrait(officer)}<div><small>${officer.role}</small><h3>${officer.name} <i>${officer.hanja}</i></h3><p>${officer.summary}</p><span>등용 가능성 <b>${chance}%</b> · 접촉 ${candidate.contact}</span></div><button data-action="recruit-officer" data-officer="${officer.id}" type="button" ${canRecruit ? '' : 'disabled'}>등용 제안</button></article>`;
    }).join('')}</div></section>` : `<section class="empty-banner"><span>人</span><div><h3>접촉한 재야 인재가 없습니다</h3><p>우리 도시에서 인재 탐색을 실행하십시오. 진류는 양쪽 진영의 숨은 인재가 모이는 곳입니다.</p></div><button data-action="nav" data-view="map" type="button">지도로 이동</button></section>`}
    <div class="officer-grid">${officers.map((officer) => renderOfficerCard(state, officer)).join('')}</div>
  </section>`;
}

function renderArmy(state: GameState): string {
  const cities = factionCities(state, state.playerFactionId);
  return `<section class="content-view army-view">
    <div class="page-heading"><div><span>THREE-LINE COMMAND</span><h1>군단과 출전</h1><p>장수 3명을 좌·중·우에 배치하고 병종 상성, 진형, 고무 책략을 결정합니다.</p></div><div class="heading-stat"><small>우리 도시</small><b>${cities.length}</b><span>승리 목표 ${CITY_DEFINITIONS[FACTIONS[state.enemyFactionId].capitalId].name}</span></div></div>
    <div class="troop-cycle"><article><i>馬</i><b>기병</b><span>궁병에 강함</span></article><em>›</em><article><i>弓</i><b>궁병</b><span>보병에 강함</span></article><em>›</em><article><i>盾</i><b>보병</b><span>기병에 강함</span></article><em>↺</em></div>
    <div class="army-city-grid">${cities.map((city) => {
      const officers = activeOfficers(state, state.playerFactionId, city.id);
      const targets = connectedTargets(state, city.id);
      return `<article class="army-city-card"><header><div><span>${CITY_DEFINITIONS[city.id].hanja}</span><div><small>출전 거점</small><h2>${CITY_DEFINITIONS[city.id].name}</h2></div></div><b>${formatNumber(city.troops)}명</b></header>
        <div class="army-officer-row">${officers.length ? officers.map((officer) => `<div>${officerPortrait(OFFICERS[officer.id], 'small')}<span>${OFFICERS[officer.id].name}</span><small>피로 ${officer.fatigue}</small></div>`).join('') : '<p>이 도시에 활동 가능한 장수가 없습니다.</p>'}</div>
        <div class="army-readiness"><span>장수 ${officers.length}/3</span><span>최소 수비대 800</span><span>성벽 ${city.wall}</span></div>
        ${targets.length ? `<div class="target-list"><span>연결된 목표</span>${targets.map((target) => `<button data-action="open-battle" data-source="${city.id}" data-target="${target.id}" type="button" ${officers.length < 3 || city.troops < 3200 || state.actionPoints <= 0 || Boolean(state.pendingEventId) ? 'disabled' : ''}><i style="background:${factionColor(target.ownerId)}">${factionCrest(target.ownerId)}</i><div><b>${CITY_DEFINITIONS[target.id].name}</b><small>병력 ${formatNumber(target.troops)} · 성벽 ${target.wall}</small></div><span>출전 준비 →</span></button>`).join('')}</div>` : '<div class="safe-city">인접한 적대 도시가 없습니다.</div>'}
      </article>`;
    }).join('')}</div>
    <section class="battle-principles"><article><b>어린진</b><p>중앙 돌파가 강하지만 좌우 방어가 얇습니다.</p></article><article><b>방원진</b><p>피해와 사기 하락을 줄이지만 공격 속도가 낮습니다.</p></article><article><b>고무</b><p>첫 라운드 사기를 높이지만 뛰어난 적 참모가 효과를 줄일 수 있습니다.</p></article></section>
  </section>`;
}

function categoryLabel(category: GameState['chronicle'][number]['category']): string {
  return { system: '계절', domestic: '내정', officer: '장수', battle: '전쟁', event: '사건', warning: '경고' }[category];
}

function renderChronicle(state: GameState): string {
  const playerScore = campaignScore(state, state.playerFactionId);
  const enemyScore = campaignScore(state, state.enemyFactionId);
  const playerCities = factionCities(state, state.playerFactionId).length;
  return `<section class="content-view chronicle-view">
    <div class="page-heading"><div><span>YOUR ALTERNATE HISTORY</span><h1>연대기와 목표</h1><p>모든 수치가 아니라 기억할 선택과 전투를 기록합니다. 이 기록이 캠페인 결말의 재료가 됩니다.</p></div><div class="heading-stat"><small>진행 턴</small><b>${state.turn}/${VERTICAL_MAX_TURN}</b><span>${state.season}</span></div></div>
    <div class="objective-card"><div class="objective-copy"><span>VERTICAL SLICE OBJECTIVE</span><h2>${CITY_DEFINITIONS[FACTIONS[state.enemyFactionId].capitalId].name}의 깃발을 내리십시오</h2><p>먼저 진류를 확보해 장수와 보급을 전진시킨 뒤 상대 수도를 공격해야 합니다. ${VERTICAL_MAX_TURN}턴을 넘기면 도시·명성·치안으로 판정합니다.</p><div class="objective-progress"><i style="width:${clamp((playerCities / 3) * 100, 0, 100)}%"></i></div><small>우리 도시 ${playerCities}/3</small></div><div class="score-duel"><article style="--score:${FACTIONS[state.playerFactionId].color}"><small>${FACTIONS[state.playerFactionId].name}</small><b>${playerScore}</b><span>천하 점수</span></article><em>對</em><article style="--score:${FACTIONS[state.enemyFactionId].color}"><small>${FACTIONS[state.enemyFactionId].name}</small><b>${enemyScore}</b><span>천하 점수</span></article></div></div>
    <div class="chronicle-layout"><aside><h3>이번 판의 원칙</h3><ul><li>행동점은 다음 계절로 이월되지 않습니다.</li><li>장수 3명이 같은 도시에 있어야 출전할 수 있습니다.</li><li>공격 후 살아남은 장수는 점령 도시로 이동합니다.</li><li>전투는 같은 시드와 입력에서 같은 결과가 나옵니다.</li></ul><button data-action="export-save" type="button">저장 JSON 내보내기</button></aside><div class="timeline">${state.chronicle.map((entry) => `<article class="timeline-entry ${entry.category}"><div class="timeline-turn"><b>${entry.turn}</b><small>${entry.season}</small></div><div><span>${categoryLabel(entry.category)}</span><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.body)}</p></div>${entry.importance >= 4 ? '<i>重要</i>' : ''}</article>`).join('')}</div></div>
  </section>`;
}

function renderBattleSetup(state: GameState, draft: BattleDraft): string {
  const source = state.cities[draft.sourceCityId];
  const target = state.cities[draft.targetCityId];
  const officers = activeOfficers(state, state.playerFactionId, source.id).filter((officer) => officer.fatigue < 90);
  const maxCommit = Math.max(2400, source.troops - 800);
  const duplicate = new Set(draft.lines.map((line) => line.officerId)).size !== draft.lines.length;
  const foodCost = battleFoodCost(draft.committedTroops);
  const canConfirm = !duplicate && draft.lines.length === 3 && state.actionPoints > 0 && state.factions[state.playerFactionId].food >= foodCost && source.troops - draft.committedTroops >= 800;
  return `<div class="modal-backdrop battle-setup-backdrop"><section class="modal-card battle-setup" role="dialog" aria-modal="true" aria-label="출전 준비">
    <button class="modal-close" data-action="close-battle" type="button">×</button>
    <div class="battle-setup-head"><span>WAR COUNCIL</span><h2>${CITY_DEFINITIONS[source.id].name} → ${CITY_DEFINITIONS[target.id].name}</h2><p>장수와 병종을 라인별로 배치하십시오. 수비군 병력 ${formatNumber(target.troops)}, 성벽 ${target.wall}.</p></div>
    <div class="battle-resource-strip"><span>행동점 <b>1</b></span><span>원정 군량 <b>${formatNumber(foodCost)}</b></span><span>투입 병력 <b>${formatNumber(draft.committedTroops)}</b></span><span>잔류 수비대 <b>${formatNumber(source.troops - draft.committedTroops)}</b></span></div>
    <div class="line-editor">${draft.lines.map((line, index) => {
      const officer = OFFICERS[line.officerId];
      return `<article><header><span>${['左', '中', '右'][index]}</span><b>${['좌군', '중군', '우군'][index]}</b></header><div class="line-officer">${officerPortrait(officer)}<div><select data-battle-field="officer" data-line-index="${index}" aria-label="${index}번 라인 장수">${officers.map((candidate) => `<option value="${candidate.id}" ${candidate.id === line.officerId ? 'selected' : ''}>${OFFICERS[candidate.id].name} · 피로 ${candidate.fatigue}</option>`).join('')}</select><small>${officer.traitName}</small></div></div><label>병종<select data-battle-field="troop" data-line-index="${index}">${(['infantry', 'cavalry', 'archer'] as TroopType[]).map((type) => `<option value="${type}" ${line.troopType === type ? 'selected' : ''}>${TROOP_ICONS[type]} ${TROOP_LABELS[type]} · 적성 ${officer.aptitudes[type]}</option>`).join('')}</select></label></article>`;
    }).join('')}</div>
    ${duplicate ? '<div class="battle-warning">같은 장수를 두 라인에 배치할 수 없습니다.</div>' : ''}
    <div class="battle-options"><label><span>진형</span><select data-battle-field="formation">${(['arrow', 'circle'] as Formation[]).map((formation) => `<option value="${formation}" ${draft.formation === formation ? 'selected' : ''}>${FORMATION_LABELS[formation]} · ${formation === 'arrow' ? '중앙 공격' : '전체 방어'}</option>`).join('')}</select></label><label><span>책략</span><select data-battle-field="tactic">${(['none', 'inspire'] as Tactic[]).map((tactic) => `<option value="${tactic}" ${draft.tactic === tactic ? 'selected' : ''}>${TACTIC_LABELS[tactic]} · ${tactic === 'none' ? '안정적' : '초기 사기 상승'}</option>`).join('')}</select></label><label class="troop-slider"><span>투입 병력 <b>${formatNumber(draft.committedTroops)}</b></span><input data-battle-field="troops" type="range" min="2400" max="${maxCommit}" step="300" value="${draft.committedTroops}" /><small>도시에 최소 800명을 남겨야 합니다.</small></label></div>
    <div class="battle-setup-footer"><button class="paper-button" data-action="close-battle" type="button">취소</button><button class="start-button" data-action="confirm-battle" type="button" ${canConfirm ? '' : 'disabled'}>전투를 시작한다 <b>⚔</b></button></div>
  </section></div>`;
}

function renderBattleReport(state: GameState, result: BattleResult): string {
  const playerWasAttacker = result.attackerFactionId === state.playerFactionId;
  const playerWon = playerWasAttacker ? result.attackerWon : !result.attackerWon;
  return `<div class="modal-backdrop"><section class="modal-card battle-report" role="dialog" aria-modal="true" aria-label="전투 결과">
    <button class="modal-close" data-action="close-report" type="button">×</button>
    <div class="report-banner ${playerWon ? 'victory' : 'defeat'}"><span>${playerWon ? '勝' : '退'}</span><div><small>${playerWon ? 'BATTLE WON' : 'BATTLE REPORT'}</small><h2>${escapeHtml(result.headline)}</h2><p>${FACTIONS[result.attackerFactionId].name}의 공격 · ${CITY_DEFINITIONS[result.targetCityId].name}</p></div></div>
    <div class="loss-grid"><article><small>공격군 잔여</small><b>${formatNumber(result.attackerRemaining)}</b><span>손실 ${formatNumber(result.attackerLosses)}</span></article><article><small>수비군 잔여</small><b>${formatNumber(result.defenderRemaining)}</b><span>손실 ${formatNumber(result.defenderLosses)}</span></article><article><small>최고 공적</small><b>${escapeHtml(result.standout)}</b><span>가장 많은 피해 기여</span></article></div>
    <section class="factor-section"><span>승패를 가른 요인</span>${result.factors.map((factor, index) => `<article><b>${index + 1}</b><p>${escapeHtml(factor)}</p></article>`).join('')}</section>
    <details class="battle-log"><summary>6라운드 전투 기록 보기 <b>${result.logs.length}개</b></summary><div>${result.logs.map((log) => `<p class="${log.tone}"><span>${log.round ? `${log.round}R` : '準備'}</span>${escapeHtml(log.text)}</p>`).join('')}</div></details>
    <div class="report-actions"><button class="primary-ink" data-action="close-report" type="button">전장으로 돌아가기</button><button class="paper-button" data-action="nav" data-view="chronicle" type="button">연대기 확인</button></div>
  </section></div>`;
}

function renderEventModal(state: GameState): string {
  const event = pendingEvent(state);
  if (!event) return '';
  return `<div class="modal-backdrop event-backdrop"><section class="modal-card event-modal" role="dialog" aria-modal="true" aria-label="계절 사건">
    <div class="event-illustration"><div class="event-moon"></div><span>卷</span><i></i><b></b></div>
    <div class="event-copy"><span>${event.kicker}</span><h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.intro)}</p></div>
    <div class="event-choices">${event.choices.map((choice, index) => `<button data-action="event-choice" data-choice="${choice.id}" type="button"><i>${index + 1}</i><div><b>${escapeHtml(choice.label)}</b><p>${escapeHtml(choice.description)}</p></div><span>→</span></button>`).join('')}</div>
    <small class="event-note">사건 선택은 자동 저장되며 연대기에 남습니다.</small>
  </section></div>`;
}

function renderEndModal(state: GameState): string {
  const victory = state.status === 'victory';
  const winner = victory ? state.playerFactionId : state.enemyFactionId;
  const playerCities = factionCities(state, state.playerFactionId).length;
  const active = activeOfficers(state, state.playerFactionId).sort((a, b) => b.merit - a.merit);
  return `<div class="modal-backdrop ending-backdrop"><section class="modal-card ending-modal" role="dialog" aria-modal="true" aria-label="캠페인 결과">
    <div class="ending-seal ${victory ? 'victory' : 'defeat'}">${victory ? '統' : '再'}</div><span>${victory ? 'VERTICAL SLICE COMPLETE' : 'THE CHRONICLE CONTINUES'}</span><h2>${victory ? `${FACTIONS[winner].name}, 중원 삼도를 장악하다` : '첫 연대기는 여기서 멈추다'}</h2><p>${victory ? `${state.turn}턴 ${state.season}, ${CITY_DEFINITIONS[FACTIONS[state.enemyFactionId].capitalId].name}의 깃발이 내려갔습니다. 당신의 선택으로 만들어진 첫 대체 역사가 완성되었습니다.` : '수도를 잃었지만 같은 군주와 다른 행동 순서로 다시 시작하면 결과가 달라집니다.'}</p>
    <div class="ending-stats"><article><small>진행 턴</small><b>${state.turn}</b></article><article><small>보유 도시</small><b>${playerCities}/3</b></article><article><small>천하 점수</small><b>${campaignScore(state, state.playerFactionId)}</b></article><article><small>최고 공적</small><b>${active[0] ? OFFICERS[active[0].id].name : '-'}</b></article></div>
    <div class="ending-actions"><button class="start-button" data-action="restart-game" type="button">같은 군주로 다시 시작</button><button class="paper-button" data-action="back-title" type="button">다른 군주 선택</button></div>
  </section></div>`;
}

function renderGame(state: GameState): string {
  const currentView = view === 'map' ? renderMap(state) : view === 'court' ? renderCourt(state) : view === 'army' ? renderArmy(state) : renderChronicle(state);
  return `<div class="campaign-app" style="--player:${FACTIONS[state.playerFactionId].color};--player-pale:${FACTIONS[state.playerFactionId].pale}">
    ${renderCampaignHeader(state)}
    <main class="campaign-main">${currentView}</main>
    <div class="turn-footer"><div><span>이번 계절</span><b>행동점 ${state.actionPoints}/3</b><small>${state.pendingEventId ? '사건 결정을 기다리는 중' : state.actionPoints ? '남은 행동을 사용하거나 계절을 종료하십시오.' : '모든 행동점을 사용했습니다.'}</small></div><button data-action="end-turn" type="button" ${aiThinking || Boolean(state.pendingEventId) || state.status !== 'playing' ? 'disabled' : ''}>${aiThinking ? '적 세력이 움직이는 중…' : '계절 종료'} <b>→</b></button></div>
    ${renderBottomNav()}
    ${battleDraft ? renderBattleSetup(state, battleDraft) : ''}
    ${battleReportOpen && state.lastBattle ? renderBattleReport(state, state.lastBattle) : ''}
    ${state.pendingEventId ? renderEventModal(state) : ''}
    ${state.status !== 'playing' ? renderEndModal(state) : ''}
    ${helpOpen ? renderHelpModal() : ''}
    ${aiThinking ? '<div class="ai-status"><i></i><span>적 세력이 계절 계획을 세우는 중</span></div>' : ''}
    <div class="toast" id="toast" role="status"></div>
  </div>`;
}

function render(): void {
  app.innerHTML = screen === 'title' || !game ? renderTitle() : renderGame(game);
}

function setGame(next: GameState): void {
  game = next;
  selectedCityId = next.selectedCityId;
  view = 'map';
  screen = 'game';
  battleDraft = null;
  battleReportOpen = false;
  helpOpen = false;
  render();
  void persist();
}

function openBattle(sourceCityId: CityId, targetCityId: CityId): void {
  if (!game) return;
  const draft = defaultBattleDraft(game, sourceCityId, targetCityId);
  if (!draft) {
    playSound('failure');
    showToast('이 도시에 활동 가능한 장수 3명과 충분한 병력이 필요합니다.', 'bad');
    return;
  }
  battleDraft = draft;
  playSound('battle');
  render();
}

function updateBattleDraftFromSelect(element: HTMLSelectElement | HTMLInputElement): void {
  if (!battleDraft) return;
  const field = element.dataset.battleField;
  if (field === 'formation') battleDraft.formation = element.value as Formation;
  if (field === 'tactic') battleDraft.tactic = element.value as Tactic;
  if (field === 'troops') battleDraft.committedTroops = Number(element.value);
  const lineIndex = Number(element.dataset.lineIndex);
  if (Number.isInteger(lineIndex) && battleDraft.lines[lineIndex]) {
    if (field === 'officer') battleDraft.lines[lineIndex].officerId = element.value as OfficerId;
    if (field === 'troop') battleDraft.lines[lineIndex].troopType = element.value as TroopType;
  }
  render();
}

async function exportSave(): Promise<void> {
  if (!game) return;
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `천하일지-${game.campaignId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast('현재 연대기를 JSON으로 내보냈습니다.', 'good');
}

app.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const actionable = target.closest<HTMLElement>('[data-action]');
  if (!actionable) return;
  if (actionable.matches('[disabled]')) return;
  const action = actionable.dataset.action;

  if (action !== 'toggle-sound' && action !== 'close-help') playSound('tap');

  if (action === 'select-faction') {
    selectedFaction = actionable.dataset.faction as 'cao' | 'liu';
    render();
    return;
  }
  if (action === 'scroll-new') {
    document.querySelector('#newChronicle')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (action === 'start-game') {
    void clearGame();
    setGame(createNewGame(selectedFaction));
    playSound('event');
    return;
  }
  if (action === 'continue-game' && savedGame) {
    const errors = invariantErrors(savedGame);
    if (errors.length) {
      showToast(`저장 검증 실패: ${errors[0]}`, 'bad');
      return;
    }
    setGame(savedGame);
    return;
  }
  if (action === 'back-title') {
    if (game) savedGame = game;
    screen = 'title';
    game = null;
    battleDraft = null;
    battleReportOpen = false;
    helpOpen = false;
    render();
    return;
  }
  if (action === 'toggle-sound') {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('threecountry:sound', soundEnabled ? 'on' : 'off'); } catch {}
    if (soundEnabled) playSound('success');
    render();
    return;
  }
  if (action === 'toggle-help') {
    helpOpen = !helpOpen;
    render();
    return;
  }
  if (action === 'close-help') {
    if (target.closest('[data-stop-close]') && !target.closest('.modal-close')) return;
    helpOpen = false;
    render();
    return;
  }
  if (!game) return;
  if (action === 'nav') {
    view = actionable.dataset.view as View;
    battleReportOpen = false;
    render();
    return;
  }
  if (action === 'select-city') {
    selectedCityId = actionable.dataset.city as CityId;
    game.selectedCityId = selectedCityId;
    view = 'map';
    render();
    return;
  }
  if (action === 'city-action') {
    const result = performCityAction(game, actionable.dataset.city as CityId, actionable.dataset.cityAction as Parameters<typeof performCityAction>[2]);
    commit(result, { sound: 'action' });
    return;
  }
  if (action === 'recruit-officer') {
    const result = recruitCandidate(game, actionable.dataset.officer as OfficerId);
    commit(result, { sound: result.ok && result.state.officers[actionable.dataset.officer as OfficerId].status === 'active' ? 'success' : 'failure' });
    return;
  }
  if (action === 'assign-governor') {
    const result = assignGovernor(game, actionable.dataset.city as CityId, actionable.dataset.officer as OfficerId);
    commit(result, { sound: 'success' });
    return;
  }
  if (action === 'open-battle') {
    openBattle(actionable.dataset.source as CityId, actionable.dataset.target as CityId);
    return;
  }
  if (action === 'close-battle') {
    battleDraft = null;
    render();
    return;
  }
  if (action === 'confirm-battle' && battleDraft) {
    const result = attackCity(game, battleDraft);
    battleDraft = null;
    commit(result, { battle: result.ok, sound: result.ok && result.state.lastBattle?.attackerWon ? 'success' : 'failure' });
    return;
  }
  if (action === 'close-report') {
    battleReportOpen = false;
    render();
    return;
  }
  if (action === 'event-choice') {
    const result = resolveEventChoice(game, actionable.dataset.choice ?? '');
    commit(result, { sound: 'event' });
    return;
  }
  if (action === 'end-turn') {
    aiThinking = true;
    render();
    window.setTimeout(() => {
      if (!game) return;
      const result = endTurn(game);
      aiThinking = false;
      if (result.ok) {
        game = result.state;
        selectedCityId = game.selectedCityId;
        battleReportOpen = Boolean(game.lastBattle);
        render();
        playSound(game.status === 'victory' ? 'victory' : game.status === 'defeat' ? 'failure' : 'event');
        showToast(result.message, game.status === 'defeat' ? 'bad' : 'good');
        void persist();
      } else {
        render();
        showToast(result.message, 'bad');
      }
    }, 520);
    return;
  }
  if (action === 'restart-game') {
    const faction = game.playerFactionId;
    void clearGame();
    setGame(createNewGame(faction));
    return;
  }
  if (action === 'export-save') {
    void exportSave();
  }
});

app.addEventListener('change', (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement || target instanceof HTMLInputElement) {
    if (target.dataset.battleField) updateBattleDraftFromSelect(target);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (helpOpen) helpOpen = false;
    else if (battleDraft) battleDraft = null;
    else if (battleReportOpen) battleReportOpen = false;
    render();
  }
  if (screen === 'game' && game && !event.metaKey && !event.ctrlKey && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement)) {
    const key = event.key.toLowerCase();
    if (key === 'm') view = 'map';
    if (key === 'c') view = 'court';
    if (key === 'a') view = 'army';
    if (key === 'l') view = 'chronicle';
    if (['m', 'c', 'a', 'l'].includes(key)) render();
  }
});

async function initialize(): Promise<void> {
  savedGame = await loadGame();
  if (savedGame) {
    const errors = invariantErrors(savedGame);
    if (errors.length) {
      console.warn('Invalid save ignored', errors);
      savedGame = null;
    }
  }
  render();
}

void initialize();
