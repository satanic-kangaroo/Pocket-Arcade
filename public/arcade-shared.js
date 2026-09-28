/* arcade-shared.js — Pocket Arcade Shared Utilities
   Provides: unified mute, toast, pause UI, hints, auto-pause, score+toast
*/
(function () {
  'use strict';
  if (window.ArcadeShared) return;

  const MUTE_PREFIX = 'arcade_muted_';
  const HINT_PREFIX = 'arcade_hint_seen_';

  const ALL_GAMES = [
    'balloon', 'pancake', 'simon', 'snake', 'pong', 'pony',
    'tetris', 'breakout', 'pinkie-adventure', '2048', 'memory', 'neon-survivor'
  ];

  const BEST_KEYS = {
    'balloon': 'balloon_best',
    'pancake': 'pancake_best',
    'simon': 'simon_best',
    'snake': 'snake_best',
    'pony': 'pinkie_runner_hi',
    'tetris': 'tetris_best',
    'breakout': 'breakout_best',
    'pinkie-adventure': 'pinkie_adv_best',
    '2048': '2048_best',
    'memory': 'memory_best',
  };

  const STYLES = `
    .ash-toast {
      position: fixed; bottom: 90px; left: 50%;
      transform: translate(-50%, 60px) scale(0.9);
      padding: 12px 22px;
      background: rgba(11,15,26,0.96);
      border: 1.5px solid rgba(100,116,139,0.5);
      border-radius: 999px;
      color: #E2E8F0;
      font-family: 'Vazirmatn', system-ui, sans-serif;
      font-size: 0.85rem; font-weight: 700;
      box-shadow: 0 20px 60px -12px rgba(0,0,0,0.9);
      z-index: 99999;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease, transform 0.4s cubic-bezier(.22,1,.36,1);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      white-space: nowrap; direction: rtl;
      max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
    }
    .ash-toast.show { opacity: 1; transform: translate(-50%, 0) scale(1); }
    .ash-toast.success { border-color: rgba(62,230,160,0.6); color: #3EE6A0; }
    .ash-toast.gold { border-color: rgba(255,209,102,0.6); color: #FFD166; }
    .ash-toast.danger { border-color: rgba(255,77,143,0.6); color: #FF4D8F; }

    .ash-modal {
      position: fixed; inset: 0; z-index: 99998;
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
      opacity: 0; visibility: hidden;
      transition: opacity .22s ease, visibility 0s linear .22s;
      direction: rtl;
    }
    .ash-modal.open {
      opacity: 1; visibility: visible;
      transition: opacity .22s ease, visibility 0s;
    }
    .ash-backdrop {
      position: absolute; inset: 0;
      background: rgba(3,5,10,0.82);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    }
    .ash-panel {
      position: relative; width: 100%; max-width: 22rem;
      border-radius: 1.25rem;
      background: linear-gradient(180deg, #131C2E 0%, #0B1220 100%);
      border: 2px solid rgba(71,85,105,0.6);
      box-shadow: 0 32px 60px -18px rgba(0,0,0,0.9), 0 0 60px -20px #00F0FF;
      transform: translateY(20px) scale(0.96);
      transition: transform .3s cubic-bezier(.22,1,.36,1);
      padding: 1.5rem 1.25rem 1.25rem;
      text-align: center; overflow: hidden;
    }
    .ash-modal.open .ash-panel { transform: translateY(0) scale(1); }
    .ash-panel::before {
      content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
      background: linear-gradient(90deg, transparent, #00F0FF, #C084FC, transparent);
      opacity: 0.8;
    }
    .ash-icon { font-size: 2.6rem; line-height: 1; margin-bottom: 0.5rem; }
    .ash-title {
      font-family: 'Press Start 2P', 'Vazirmatn', monospace;
      font-size: 1.1rem; color: #00F0FF;
      text-shadow: 0 0 20px rgba(0,240,255,0.6);
      margin: 0 0 0.5rem;
    }
    .ash-title.gold { color: #FFD166; }
    .ash-sub { font-size: 0.78rem; color: #94A3B8; margin: 0 0 1.1rem; line-height: 1.7; }
    .ash-hint-content {
      text-align: right; font-size: 0.8rem; color: #CBD5E1;
      line-height: 2; margin-bottom: 1.1rem;
      padding: 0.75rem 0.9rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(71,85,105,0.35);
      border-radius: 0.75rem;
    }
    .ash-kbd {
      display: inline-block; padding: 1px 6px;
      font-family: 'Press Start 2P', monospace; font-size: 0.6rem;
      background: rgba(0,240,255,0.1);
      border: 1px solid rgba(0,240,255,0.3);
      border-radius: 4px; color: #00F0FF;
      margin: 0 2px;
    }
    .ash-btn {
      display: flex; align-items: center; justify-content: center;
      gap: 0.5rem; width: 100%;
      padding: 0.85rem; border-radius: 0.75rem;
      font-family: 'Vazirmatn', inherit;
      font-size: 0.88rem; font-weight: 800;
      border: none; cursor: pointer;
      transition: transform .1s, box-shadow .1s;
      margin-top: 0.5rem;
    }
    .ash-btn-primary {
      background: linear-gradient(180deg, #00F0FF 0%, #00A0D0 100%);
      color: #06080F;
      box-shadow: 0 4px 0 0 #005070;
    }
    .ash-btn-primary:active { transform: translateY(3px); box-shadow: 0 1px 0 0 #005070; }
    .ash-btn-danger {
      background: rgba(255,77,143,0.08);
      color: #FF4D8F;
      border: 1.5px solid rgba(255,77,143,0.4);
    }
    .ash-btn-danger:active { transform: translateY(3px); }
    .ash-modal-open { overflow: hidden !important; }
    .icon-btn.muted { color: #FF4D8F !important; }
  `;

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const s = document.createElement('style');
    s.id = 'arcade-shared-styles';
    s.textContent = STYLES;
    (document.head || document.documentElement).appendChild(s);
  }

  /* MUTE */
  const GLOBAL_MUTE_KEY = 'arcade_muted_all';

  function isAllMuted() {
    try { return localStorage.getItem(GLOBAL_MUTE_KEY) === '1'; }
    catch { return false; }
  }

  function setAllMuted(m) {
    try { localStorage.setItem(GLOBAL_MUTE_KEY, m ? '1' : '0'); } catch {}
    ALL_GAMES.forEach(id => setMuted(id, m));
  }

  function allMuted() { return isAllMuted(); }

  function isMuted(gameId) {
    try {
      if (localStorage.getItem(GLOBAL_MUTE_KEY) === '1') return true;
      return localStorage.getItem(MUTE_PREFIX + gameId) === '1';
    } catch { return false; }
  }
  function setMuted(gameId, muted) {
    try { localStorage.setItem(MUTE_PREFIX + gameId, muted ? '1' : '0'); } catch {}
  }
  function toggleMute(gameId) {
    const next = !isMuted(gameId);
    try {
      // اگر global روشن است، اول آن را پاک کن تا unmute تکی ممکن شود؛
      // کلیدهای تکی بقیه بازیها دست نخورده میمانند (بیصدا میمانند)
      if (localStorage.getItem(GLOBAL_MUTE_KEY) === '1') {
        localStorage.setItem(GLOBAL_MUTE_KEY, '0');
      }
    } catch {}
    setMuted(gameId, next);
    return next;
  }
  function anyMuted() { return ALL_GAMES.some(id => isMuted(id)); }

  function bindMuteButton(btn, gameId, onChange) {
    if (!btn) return null;
    injectStyles();
    let state = isMuted(gameId);
    const update = () => {
      btn.textContent = state ? '🔇' : '🔊';
      btn.classList.toggle('muted', state);
    };
    update();
    btn.addEventListener('click', e => {
      e.preventDefault();
      state = toggleMute(gameId);
      update();
      if (onChange) onChange(state);
    });
    return {
      get muted() { return state; },
      refresh() { state = isMuted(gameId); update(); }
    };
  }

  /* TOAST */
  let toastTimer = null;
  function toast(msg, opts) {
    injectStyles();
    opts = opts || {};
    const duration = opts.duration || 2400;
    let el = document.getElementById('ashToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ashToast';
      el.className = 'ash-toast';
      document.body.appendChild(el);
    }
    el.className = 'ash-toast' + (opts.type ? ' ' + opts.type : '');
    el.textContent = msg;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  /* PAUSE UI */
  function createPauseUI(opts) {
    injectStyles();
    opts = opts || {};
    const quitUrl = opts.quitUrl || './arcade.html';

    const modal = document.createElement('div');
    modal.className = 'ash-modal';
    modal.innerHTML =
      '<div class="ash-backdrop"></div>' +
      '<div class="ash-panel">' +
        '<div class="ash-icon">⏸</div>' +
        '<h2 class="ash-title">' + (opts.title || 'توقف') + '</h2>' +
        '<p class="ash-sub">' + (opts.subtitle || 'بازی موقتاً متوقف شده') + '</p>' +
        '<button class="ash-btn ash-btn-primary" data-ash-action="resume" type="button">▶ ادامه</button>' +
        '<button class="ash-btn ash-btn-danger" data-ash-action="quit" type="button">🏠 خروج به آرکید</button>' +
      '</div>';
    document.body.appendChild(modal);

    let open = false;
    function show() {
      if (open) return;
      open = true;
      modal.classList.add('open');
      document.body.classList.add('ash-modal-open');
      setTimeout(() => {
        const b = modal.querySelector('[data-ash-action="resume"]');
        if (b) b.focus({ preventScroll: true });
      }, 100);
    }
    function hide() {
      if (!open) return;
      open = false;
      modal.classList.remove('open');
      document.body.classList.remove('ash-modal-open');
    }
    modal.querySelector('[data-ash-action="resume"]').addEventListener('click', e => {
      e.preventDefault();
      hide();
      if (opts.onResume) opts.onResume();
    });
    modal.querySelector('[data-ash-action="quit"]').addEventListener('click', e => {
      e.preventDefault();
      if (opts.onQuit) opts.onQuit();
      window.location.href = quitUrl;
    });
    return { show, hide, get isOpen() { return open; } };
  }

  /* HINT */
  function showHintOnce(gameId, contentHTML, opts) {
    try {
      if (localStorage.getItem(HINT_PREFIX + gameId) === '1') return false;
    } catch {}
    injectStyles();
    opts = opts || {};
    const modal = document.createElement('div');
    modal.className = 'ash-modal';
    modal.innerHTML =
      '<div class="ash-backdrop"></div>' +
      '<div class="ash-panel">' +
        '<div class="ash-icon">🎮</div>' +
        '<h2 class="ash-title">' + (opts.title || 'چطور بازی کنیم؟') + '</h2>' +
        '<div class="ash-hint-content">' + contentHTML + '</div>' +
        '<button class="ash-btn ash-btn-primary" data-ash-action="close" type="button">فهمیدم</button>' +
      '</div>';
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 60);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      modal.classList.remove('open');
      try { localStorage.setItem(HINT_PREFIX + gameId, '1'); } catch {}
      setTimeout(() => modal.remove(), 250);
    };
    modal.querySelector('[data-ash-action="close"]').addEventListener('click', close);
    modal.querySelector('.ash-backdrop').addEventListener('click', close);
    return true;
  }

  /* AUTO-PAUSE */
  function onTabHidden(cb) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cb();
    });
  }

  /* BEST */
  function getBest(gameId) {
    try {
      const k = BEST_KEYS[gameId];
      return k ? Number(localStorage.getItem(k) || 0) : 0;
    } catch { return 0; }
  }

  /* SAVE SCORE + TOAST */
  async function saveScore(gameId, score, opts) {
    opts = opts || {};
    const oldBest = getBest(gameId);
    const isNewBest = score > oldBest && score > 0;

    if (window.ArcadeAPI && ArcadeAPI.saveScore) {
      try { await ArcadeAPI.saveScore(gameId, score, opts); } catch {}
    }

    if (!opts.silent) {
      if (isNewBest) toast('🏆 رکورد جدید!', { type: 'gold', duration: 3000 });
      else if (score > 0) toast('✅ امتیازت ثبت شد', { type: 'success' });
    }

    return { isNewBest, oldBest };
  }

  window.ArcadeShared = {
    ALL_GAMES,
    isMuted, setMuted, toggleMute, setAllMuted, allMuted, anyMuted,
    bindMuteButton,
    toast,
    createPauseUI,
    showHintOnce,
    onTabHidden,
    getBest, saveScore,
  };

  if (document.head) injectStyles();
  else document.addEventListener('DOMContentLoaded', injectStyles);
})();
