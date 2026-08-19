const RELEASE = '0.7.1';
let scheduled = false;
let lastHero = '';

function syncPanel() {
  scheduled = false;
  const panel = document.querySelector('.unit-command-panel');
  if (!panel) return;
  const profile = panel.querySelector('.unit-profile');
  panel.dataset.mobileCommand = profile ? 'ready' : 'empty';
  if (!panel.querySelector('.mobile-command-handle')) {
    panel.insertAdjacentHTML('afterbegin', `<button class="mobile-command-handle" data-mobile-command-toggle type="button"><span>⚔</span><b>장수 명령</b><small>이동 · 공격 · 기술</small><i>⌄</i></button>`);
  }
  const hero = profile?.querySelector('.profile-head h2')?.textContent?.trim() || '';
  if (hero && hero !== lastHero) {
    panel.dataset.mobileCollapsed = 'false';
    lastHero = hero;
  }
  const handle = panel.querySelector('.mobile-command-handle');
  handle?.setAttribute('aria-expanded', panel.dataset.mobileCollapsed !== 'true' ? 'true' : 'false');
  handle?.querySelector('i')?.replaceChildren(document.createTextNode(panel.dataset.mobileCollapsed === 'true' ? '⌃' : '⌄'));
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(syncPanel);
}

function togglePanel() {
  const panel = document.querySelector('.unit-command-panel');
  if (!panel || panel.dataset.mobileCommand !== 'ready') return;
  panel.dataset.mobileCollapsed = panel.dataset.mobileCollapsed === 'true' ? 'false' : 'true';
  schedule();
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.closest('[data-mobile-command-toggle]')) {
    event.preventDefault();
    event.stopPropagation();
    togglePanel();
    return;
  }
  const command = target.closest('.command-grid [data-action]');
  if (command && ['command-move', 'command-attack', 'command-skill'].includes(command.dataset.action || '')) {
    const panel = document.querySelector('.unit-command-panel');
    window.setTimeout(() => {
      if (panel) panel.dataset.mobileCollapsed = 'true';
      schedule();
    }, 120);
  }
}, true);

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
window.__mobileCommandV1 = { ready: true, version: RELEASE };
schedule();
