import {
  GLOBAL_SETTING_KEYS, PROGRESS_PREFIX, SAVE_SLOT_COUNT, SAVE_SLOT_KEY,
  createArchive, createSlot, emptySlotsState, fnv1a, normalizeSlotsState, validateArchive,
} from './save-slots-core.js';

const VERSION = '1.2.0';
const OPERATION_NAMES = {
  'west-road': '서쪽 난민로',
  'village-bell': '마을의 종',
  'guan-line': '관우의 방진',
  'chenliu-command': '진류 본진 결전',
};
let state = loadState();
let queued = false;
let modalOpen = false;
let lastSnapshotHash = '';
let sessionStartedAt = Date.now();
let autosaveTimer = 0;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_SLOT_KEY);
    return normalizeSlotsState(raw ? JSON.parse(raw) : emptySlotsState());
  } catch {
    return emptySlotsState();
  }
}

function persistState() {
  try { localStorage.setItem(SAVE_SLOT_KEY, JSON.stringify(state)); } catch {}
  expose();
}

function captureProgress() {
  const snapshot = {};
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(PROGRESS_PREFIX) || key === SAVE_SLOT_KEY || GLOBAL_SETTING_KEYS.has(key)) continue;
      const value = localStorage.getItem(key);
      if (typeof value === 'string') snapshot[key] = value;
    }
  } catch {}
  return snapshot;
}

function clearProgress() {
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(PROGRESS_PREFIX) && key !== SAVE_SLOT_KEY && !GLOBAL_SETTING_KEYS.has(key)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

function restoreSnapshot(snapshot) {
  clearProgress();
  try { Object.entries(snapshot || {}).forEach(([key, value]) => localStorage.setItem(key, value)); } catch {}
}

function currentSlot() {
  return state.slots.find((slot) => slot.id === state.activeSlot) || state.slots[0];
}

function elapsedSeconds() {
  return Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
}

function saveIntoSlot(slotId, { silent = false } = {}) {
  const snapshot = captureProgress();
  if (!Object.keys(snapshot).length) {
    if (!silent) notify('저장할 연대기 데이터가 아직 없습니다.', 'bad');
    return false;
  }
  const index = state.slots.findIndex((slot) => slot.id === Number(slotId));
  if (index < 0) return false;
  const previous = state.slots[index];
  const now = Date.now();
  state.slots[index] = createSlot({
    id: previous.id,
    name: previous.name,
    snapshot,
    now,
    playSeconds: previous.playSeconds + (previous.id === state.activeSlot ? elapsedSeconds() : 0),
  });
  state.slots[index].createdAt = previous.createdAt || now;
  state.activeSlot = previous.id;
  sessionStartedAt = now;
  lastSnapshotHash = fnv1a(JSON.stringify(snapshot));
  persistState();
  if (!silent) notify(`${previous.name}에 현재 진행을 저장했습니다.`, 'good');
  refreshModal();
  return true;
}

function autosave() {
  const snapshot = captureProgress();
  if (!Object.keys(snapshot).length) return;
  const hash = fnv1a(JSON.stringify(snapshot));
  if (hash === lastSnapshotHash) return;
  saveIntoSlot(state.activeSlot, { silent: true });
}

function backupState() {
  state.lastBackup = createArchive(state);
  persistState();
}

function loadSlot(slotId) {
  const slot = state.slots.find((entry) => entry.id === Number(slotId));
  if (!slot || !Object.keys(slot.snapshot || {}).length) return notify('비어 있는 슬롯입니다.', 'bad');
  autosave();
  backupState();
  state.activeSlot = slot.id;
  persistState();
  restoreSnapshot(slot.snapshot);
  location.reload();
}

function newSlot(slotId) {
  autosave();
  backupState();
  const id = Number(slotId);
  const index = state.slots.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const name = state.slots[index].name;
  state.slots[index] = { ...emptySlotsState().slots[index], id, name, createdAt: Date.now() };
  state.activeSlot = id;
  persistState();
  clearProgress();
  location.reload();
}

function deleteSlot(slotId) {
  const id = Number(slotId);
  const slot = state.slots.find((entry) => entry.id === id);
  if (!slot || !Object.keys(slot.snapshot || {}).length) return;
  if (!confirm(`${slot.name}의 저장 데이터를 삭제합니까? 이 작업 전에 전체 백업을 남깁니다.`)) return;
  autosave();
  backupState();
  const index = state.slots.findIndex((entry) => entry.id === id);
  state.slots[index] = { ...emptySlotsState().slots[index], id, name: slot.name, createdAt: Date.now() };
  if (state.activeSlot === id) {
    clearProgress();
    state.activeSlot = 1;
  }
  persistState();
  refreshModal();
  notify(`${slot.name}을 비웠습니다.`, 'normal');
}

function renameSlot(slotId) {
  const slot = state.slots.find((entry) => entry.id === Number(slotId));
  if (!slot) return;
  const next = prompt('연대기 이름을 입력하십시오.', slot.name)?.trim();
  if (!next) return;
  slot.name = next.slice(0, 24);
  persistState();
  refreshModal();
}

function downloadArchive() {
  autosave();
  const archive = createArchive(state);
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `threecountry-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  notify('세 슬롯을 하나의 백업 파일로 내보냈습니다.', 'good');
}

function importArchive(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const archive = JSON.parse(String(reader.result || ''));
      const validated = validateArchive(archive);
      if (!validated.ok) throw new Error(validated.reason);
      autosave();
      backupState();
      state = validated.state;
      persistState();
      const slot = currentSlot();
      if (slot && Object.keys(slot.snapshot || {}).length) restoreSnapshot(slot.snapshot);
      location.reload();
    } catch (error) {
      notify(`백업 파일을 불러오지 못했습니다: ${error.message}`, 'bad');
    }
  };
  reader.readAsText(file);
}

function recoverBackup() {
  const validated = validateArchive(state.lastBackup);
  if (!validated.ok) return notify('복구 가능한 직전 백업이 없습니다.', 'bad');
  if (!confirm('슬롯 변경 직전 상태로 복구합니까?')) return;
  state = validated.state;
  persistState();
  const slot = currentSlot();
  if (slot && Object.keys(slot.snapshot || {}).length) restoreSnapshot(slot.snapshot);
  location.reload();
}

function formatDuration(seconds = 0) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}시간 ${minutes}분`;
  return `${Math.max(0, minutes)}분`;
}

function formatDate(timestamp) {
  if (!timestamp) return '저장 없음';
  try { return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(timestamp); }
  catch { return new Date(timestamp).toLocaleString(); }
}

function slotMarkup(slot) {
  const summary = slot.summary;
  const active = slot.id === state.activeSlot;
  const filled = Boolean(summary && Object.keys(slot.snapshot || {}).length);
  return `<article class="ssv1-slot ${active ? 'active' : ''} ${filled ? 'filled' : 'empty'}" data-ssv1-slot="${slot.id}">
    <header><span>${slot.id}</span><div><small>${active ? 'ACTIVE CHRONICLE' : filled ? 'LOCAL CHRONICLE' : 'EMPTY SLOT'}</small><h3>${esc(slot.name)}</h3></div><button data-ssv1-rename="${slot.id}" type="button" aria-label="이름 변경">✎</button></header>
    ${filled ? `<div class="ssv1-summary"><strong>${OPERATION_NAMES[summary.operationId] || esc(summary.operationId)}</strong><span>${summary.difficulty} · ${summary.cleared}/4 작전 · ${summary.stars}성</span><dl><div><dt>전적</dt><dd>${summary.victories}승 ${summary.defeats}패</dd></div><div><dt>장수</dt><dd>평균 Lv.${summary.averageLevel}</dd></div><div><dt>명성</dt><dd>${summary.fame}</dd></div><div><dt>선택</dt><dd>${summary.storyChoices}개</dd></div></dl><p>${summary.hasBattle ? '전투 진행 중' : summary.screen} · ${formatDuration(slot.playSeconds)} · ${formatDate(slot.updatedAt)}</p></div>` : `<div class="ssv1-empty"><b>새 연대기를 시작할 수 있습니다.</b><p>다른 슬롯의 진행 데이터와 완전히 분리됩니다.</p></div>`}
    <footer>${filled ? `<button data-ssv1-load="${slot.id}" type="button">불러오기</button><button data-ssv1-save="${slot.id}" type="button">현재 진행 덮어쓰기</button><button data-ssv1-delete="${slot.id}" class="danger" type="button">삭제</button>` : `<button data-ssv1-new="${slot.id}" class="primary" type="button">이 슬롯에서 새 게임</button><button data-ssv1-save="${slot.id}" type="button">현재 진행 복사</button>`}</footer>
  </article>`;
}

function modalMarkup() {
  return `<div class="ssv1-modal" data-ssv1-modal><div class="ssv1-backdrop" data-ssv1-close></div><section><header><div><small>LOCAL SAVE MANAGEMENT · v${VERSION}</small><b>연대기 저장 슬롯</b><span>진행·장수 성장·장비·스토리 선택·작전 기록을 함께 보관합니다.</span></div><button data-ssv1-close type="button">×</button></header><div class="ssv1-slots">${state.slots.map(slotMarkup).join('')}</div><footer><div><span>활성 슬롯 ${state.activeSlot}</span><small>진행 중에는 약 4초마다 활성 슬롯에 자동 저장됩니다.</small></div><button data-ssv1-export type="button">전체 내보내기</button><label>백업 가져오기<input data-ssv1-import type="file" accept="application/json,.json" /></label><button data-ssv1-recover ${state.lastBackup ? '' : 'disabled'} type="button">직전 상태 복구</button><button data-ssv1-close class="primary" type="button">게임으로 돌아가기</button></footer></section></div>`;
}

function openModal() {
  if (modalOpen) return;
  autosave();
  modalOpen = true;
  document.body.insertAdjacentHTML('beforeend', modalMarkup());
  requestAnimationFrame(() => document.querySelector('[data-ssv1-modal]')?.classList.add('show'));
}

function closeModal() {
  const modal = document.querySelector('[data-ssv1-modal]');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { modal.remove(); modalOpen = false; }, 200);
}

function refreshModal() {
  if (!modalOpen) return;
  const modal = document.querySelector('[data-ssv1-modal]');
  if (!modal) return;
  modal.outerHTML = modalMarkup();
  requestAnimationFrame(() => document.querySelector('[data-ssv1-modal]')?.classList.add('show'));
}

function notify(message, tone = 'normal') {
  const existing = document.querySelector('.ssv1-toast');
  existing?.remove();
  const node = document.createElement('div');
  node.className = 'ssv1-toast';
  node.dataset.tone = tone;
  node.textContent = message;
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 200); }, 2300);
}

function addButtons() {
  document.querySelectorAll('.utility-bar:not([data-ssv1]),.title-header:not([data-ssv1])').forEach((bar) => {
    bar.dataset.ssv1 = '1';
    const target = bar.lastElementChild || bar;
    target.insertAdjacentHTML('afterbegin', `<button class="icon-button ssv1-button" data-ssv1-open type="button" aria-label="저장 슬롯"><span>記</span><i>${state.activeSlot}</i></button>`);
  });
}

function initializeSlot() {
  const snapshot = captureProgress();
  const slot = currentSlot();
  if (Object.keys(snapshot).length && !Object.keys(slot.snapshot || {}).length) saveIntoSlot(slot.id, { silent: true });
  else lastSnapshotHash = fnv1a(JSON.stringify(snapshot));
}

function expose() {
  window.__saveSlotsV1 = {
    ready: true,
    version: VERSION,
    slotCount: SAVE_SLOT_COUNT,
    activeSlot: state.activeSlot,
    filledSlots: state.slots.filter((slot) => Object.keys(slot.snapshot || {}).length).length,
    backupAvailable: Boolean(state.lastBackup),
    summaries: state.slots.map((slot) => slot.summary),
  };
}

function enhance() {
  queued = false;
  document.documentElement.classList.add('save-slots-v1-ready');
  addButtons();
  expose();
}
function schedule() { if (queued) return; queued = true; requestAnimationFrame(enhance); }

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.closest('[data-ssv1-open]')) { event.preventDefault(); openModal(); return; }
  if (target.closest('[data-ssv1-close]')) { event.preventDefault(); closeModal(); return; }
  const load = target.closest('[data-ssv1-load]'); if (load) { loadSlot(load.dataset.ssv1Load); return; }
  const save = target.closest('[data-ssv1-save]'); if (save) { saveIntoSlot(save.dataset.ssv1Save); return; }
  const start = target.closest('[data-ssv1-new]'); if (start) { newSlot(start.dataset.ssv1New); return; }
  const remove = target.closest('[data-ssv1-delete]'); if (remove) { deleteSlot(remove.dataset.ssv1Delete); return; }
  const rename = target.closest('[data-ssv1-rename]'); if (rename) { renameSlot(rename.dataset.ssv1Rename); return; }
  if (target.closest('[data-ssv1-export]')) { downloadArchive(); return; }
  if (target.closest('[data-ssv1-recover]')) { recoverBackup(); }
}, true);
document.addEventListener('change', (event) => {
  const input = event.target instanceof HTMLInputElement && event.target.matches('[data-ssv1-import]') ? event.target : null;
  if (!input) return;
  importArchive(input.files?.[0]);
}, true);
window.addEventListener('beforeunload', autosave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autosave(); });
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
initializeSlot();
autosaveTimer = window.setInterval(autosave, 4000);
window.addEventListener('pagehide', () => window.clearInterval(autosaveTimer), { once: true });
schedule();
