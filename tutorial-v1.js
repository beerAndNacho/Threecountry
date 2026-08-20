const VERSION = '1.2.0';
const KEY = 'threecountry:tutorial:v1';
const STEPS = [
  { id: 'title-start', screen: 'title', selector: '[data-action="new-game"]', action: 'new-game', eyebrow: '첫 연대기', title: '새 연대기를 시작하십시오', text: '처음에는 조조군의 시점에서 진류를 확보하는 네 개 작전을 진행합니다.' },
  { id: 'story-next', screen: 'story', selector: '[data-action="story-next"]', action: 'story-next', eyebrow: '스토리', title: '대화가 전투 조건을 만듭니다', text: '장수의 대사와 선택 장면은 자원·관계·다음 작전에 영향을 줍니다.' },
  { id: 'hub-operation', screen: 'hub', selector: '[data-ocv1-board]', action: null, eyebrow: '작전 지도', title: '별을 얻어 다음 작전을 여십시오', text: '승리하면 1성, 기준 턴 이내면 추가 1성, 네 장수가 모두 생존하면 추가 1성을 받습니다.' },
  { id: 'hub-facility', screen: 'hub', selector: '.facility-section', action: null, eyebrow: '도시 운영', title: '시설은 실제 전투 능력을 바꿉니다', text: '병영은 체력, 시장은 보상, 군량창은 기술력, 군사부는 책략 효과를 강화합니다.' },
  { id: 'hub-start', screen: 'hub', selector: '[data-ocv1-start]', action: 'ocv1-start', eyebrow: '출전 준비', title: '작전과 난이도를 확인하고 출전합니다', text: '군웅 난이도가 첫 플레이 권장값입니다. 난세와 천명은 보상이 높은 대신 적이 강해집니다.' },
  { id: 'roster-select', screen: 'roster', selector: '[data-action="toggle-hero"]', action: 'toggle-hero', eyebrow: '장수 편성', title: '역할이 다른 장수 네 명을 선택하십시오', text: '선봉·호위·회복·원거리 책략을 균형 있게 구성하면 첫 작전을 안정적으로 돌파할 수 있습니다.' },
  { id: 'roster-confirm', screen: 'roster', selector: '[data-action="confirm-roster"]', action: 'confirm-roster', eyebrow: '진입 전략', title: '장수 네 명과 진입 전략을 확정합니다', text: '선봉 돌파·정공 방진·숲길 기습은 시작 이동력·방어막·기술력에 각각 영향을 줍니다.' },
  { id: 'deployment-order', screen: 'deployment', selector: '.deployment-panel', action: null, eyebrow: '초기 배치', title: '편성 순서가 시작 위치를 결정합니다', text: '첫 두 자리는 전방, 뒤 두 자리는 후방입니다. 책사와 회복 장수는 후군이 안전합니다.' },
  { id: 'deployment-start', screen: 'deployment', selector: '[data-action="start-battle"]', action: 'start-battle', eyebrow: '전투 개시', title: '전장·날씨·목표를 확인하십시오', text: '작전마다 지형과 적 배치가 다릅니다. 출전 전에 전장 브리핑을 확인하십시오.' },
  { id: 'battle-unit', screen: 'battle', selector: '.battle-unit.player:not(.acted)', action: 'select-battle-unit', eyebrow: '직접 지휘', title: '아군 장수를 선택하십시오', text: '선택한 장수만 크게 표시되고 이동 가능 칸과 명령 패널이 열립니다.' },
  { id: 'battle-move', screen: 'battle', selector: '[data-action="command-move"]', action: 'command-move', eyebrow: '이동', title: '이동 명령을 선택하십시오', text: '숲과 언덕은 방어력이 높지만 이동 비용도 큽니다. 기병은 평지와 길에서 빠릅니다.' },
  { id: 'battle-cell', screen: 'battle', selector: '.battle-cell.reachable', action: 'battle-cell', eyebrow: '이동 위치', title: '푸른 이동 가능 칸을 선택하십시오', text: '이동 뒤에도 공격이나 기술을 사용할 수 있습니다. 적의 반격 범위를 함께 확인하십시오.' },
  { id: 'battle-command', screen: 'battle', selector: '.command-grid', action: null, eyebrow: '행동 선택', title: '공격·기술·방어·대기를 판단합니다', text: '공격 전 예측 정보에서 피해·명중·치명타·반격·지형 보정을 확인할 수 있습니다.' },
  { id: 'battle-end', screen: 'battle', selector: '[data-action="end-turn"]', action: 'end-turn', eyebrow: '턴 종료', title: '모든 장수의 행동을 마치고 턴을 넘깁니다', text: '행동하지 않은 장수가 있어도 종료할 수 있지만, 남은 행동 기회는 사라집니다.' },
  { id: 'result-record', screen: 'result', selector: '[data-ocv1-result],.result-grid', action: null, eyebrow: '전투 기록', title: '별·보상·최고 기록을 확인하십시오', text: '승리 결과는 활성 저장 슬롯에 자동 저장되고 다음 작전과 성장 보상으로 이어집니다.' },
];

let state = loadState();
let queued = false;
let currentTarget = null;
let autoTimer = 0;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      version: VERSION,
      running: Boolean(parsed.running),
      dismissed: Boolean(parsed.dismissed),
      completed: [...new Set(parsed.completed || [])],
      lastStep: String(parsed.lastStep || ''),
    };
  } catch {
    return { version: VERSION, running: false, dismissed: false, completed: [], lastStep: '' };
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  expose();
}

function screen() {
  const value = document.documentElement.dataset.screen;
  if (value) return value;
  if (document.querySelector('.result-screen')) return 'result';
  if (document.querySelector('.battle-screen')) return 'battle';
  if (document.querySelector('.deployment-screen')) return 'deployment';
  if (document.querySelector('.roster-screen')) return 'roster';
  if (document.querySelector('.hub-screen')) return 'hub';
  if (document.querySelector('.story-screen')) return 'story';
  if (document.querySelector('.title-screen')) return 'title';
  return '';
}

function availableSteps() {
  const current = screen();
  return STEPS.filter((step) => step.screen === current && !state.completed.includes(step.id));
}

function activeStep() {
  const candidates = availableSteps();
  if (!candidates.length) return null;
  const remembered = candidates.find((step) => step.id === state.lastStep);
  return remembered || candidates[0];
}

function clearTarget() {
  currentTarget?.classList.remove('tutorial-target-v1');
  currentTarget = null;
}

function closeCoach() {
  clearTarget();
  document.querySelector('[data-tutorial-v1]')?.remove();
}

function coachMarkup(step, targetFound) {
  const screenSteps = STEPS.filter((entry) => entry.screen === step.screen);
  const position = screenSteps.findIndex((entry) => entry.id === step.id) + 1;
  return `<aside class="tutorial-v1 ${targetFound ? 'target-found' : 'waiting'}" data-tutorial-v1><header><span>GUIDE ${position}/${screenSteps.length}</span><button data-tutorial-close type="button">×</button></header><small>${esc(step.eyebrow)}</small><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p><footer>${step.action && targetFound ? `<span>강조된 요소를 직접 눌러 진행하십시오.</span>` : `<button data-tutorial-next type="button">확인 · 다음 <b>→</b></button>`}<button data-tutorial-skip type="button">안내 종료</button></footer></aside>`;
}

function positionCoach(coach, target) {
  if (!target) {
    coach.style.left = '50%';
    coach.style.right = 'auto';
    coach.style.top = 'auto';
    coach.style.bottom = '18px';
    coach.style.transform = 'translateX(-50%)';
    return;
  }
  const rect = target.getBoundingClientRect();
  const width = Math.min(330, window.innerWidth - 24);
  let left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
  let top = rect.bottom + 12;
  if (top + 230 > window.innerHeight) top = Math.max(12, rect.top - 230);
  coach.style.width = `${width}px`;
  coach.style.left = `${left}px`;
  coach.style.right = 'auto';
  coach.style.top = `${top}px`;
  coach.style.bottom = 'auto';
  coach.style.transform = 'none';
}

function renderCoach() {
  closeCoach();
  if (!state.running || document.querySelector('.ssv1-modal,.sd2-modal,.v4-event-modal,.cv2-modal')) return;
  const step = activeStep();
  if (!step) {
    const remaining = STEPS.some((entry) => !state.completed.includes(entry.id));
    if (!remaining) {
      state.running = false;
      state.dismissed = false;
      persist();
    }
    return;
  }
  const target = document.querySelector(step.selector);
  if (target) {
    currentTarget = target;
    target.classList.add('tutorial-target-v1');
    target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }
  document.body.insertAdjacentHTML('beforeend', coachMarkup(step, Boolean(target)));
  const coach = document.querySelector('[data-tutorial-v1]');
  if (coach) {
    positionCoach(coach, target);
    requestAnimationFrame(() => coach.classList.add('show'));
  }
  state.lastStep = step.id;
  persist();
}

function completeStep(id) {
  if (id && !state.completed.includes(id)) state.completed.push(id);
  state.lastStep = '';
  persist();
  setTimeout(schedule, 140);
}

function startTutorial() {
  state.running = true;
  state.dismissed = false;
  state.lastStep = '';
  persist();
  schedule();
}

function restartTutorial() {
  state = { version: VERSION, running: true, dismissed: false, completed: [], lastStep: '' };
  persist();
  schedule();
}

function stopTutorial({ dismiss = true } = {}) {
  state.running = false;
  state.dismissed = dismiss;
  state.lastStep = '';
  persist();
  closeCoach();
}

function advanceInformational() {
  const step = activeStep();
  if (step) completeStep(step.id);
}

function addButtons() {
  document.querySelectorAll('.utility-bar:not([data-tutorial-button]),.title-header:not([data-tutorial-button])').forEach((bar) => {
    bar.dataset.tutorialButton = '1';
    const target = bar.lastElementChild || bar;
    target.insertAdjacentHTML('afterbegin', '<button class="icon-button tutorial-button-v1" data-tutorial-start type="button" aria-label="게임 안내">?</button>');
  });
}

function maybeAutoStart() {
  if (state.running || state.dismissed || state.completed.length) return;
  if (screen() !== 'title') return;
  window.clearTimeout(autoTimer);
  autoTimer = window.setTimeout(() => {
    if (!state.dismissed && !state.completed.length && screen() === 'title') startTutorial();
  }, 900);
}

function expose() {
  window.__tutorialV1 = {
    ready: true,
    version: VERSION,
    stepCount: STEPS.length,
    running: state.running,
    completed: state.completed.length,
    currentStep: activeStep()?.id || null,
  };
}

function enhance() {
  queued = false;
  document.documentElement.classList.add('tutorial-v1-ready');
  addButtons();
  maybeAutoStart();
  if (state.running) renderCoach();
  expose();
}
function schedule() { if (queued) return; queued = true; requestAnimationFrame(enhance); }

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.closest('[data-tutorial-start]')) {
    event.preventDefault();
    if (state.completed.length) restartTutorial(); else startTutorial();
    return;
  }
  if (target.closest('[data-tutorial-close],[data-tutorial-skip]')) {
    event.preventDefault();
    stopTutorial();
    return;
  }
  if (target.closest('[data-tutorial-next]')) {
    event.preventDefault();
    advanceInformational();
    return;
  }
  if (!state.running) return;
  const step = activeStep();
  if (!step?.action) return;
  const actionNode = target.closest('[data-action]');
  const action = actionNode?.dataset.action || (target.closest('[data-ocv1-start]') ? 'ocv1-start' : '');
  if (action === step.action) completeStep(step.id);
}, true);

window.addEventListener('resize', () => { if (state.running) schedule(); }, { passive: true });
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
schedule();
