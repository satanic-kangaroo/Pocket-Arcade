/* score.js — پل ارتباطی بازیها با بکاند Bun + پروفایل بازیکن */
(function () {
  'use strict';

  if (window.ArcadeAPI) return;

  const LS_NAME   = 'arcade_player';
  const LS_AVATAR = 'arcade_avatar';

  /* ══════════════════════════════════════════
     پروفایل
     ══════════════════════════════════════════ */
  function getProfile() {
    return {
      name:   (localStorage.getItem(LS_NAME)   || '').trim(),
      avatar: (localStorage.getItem(LS_AVATAR) || '🦊').trim()
    };
  }

  function setProfile(name, avatar) {
    const cleanName = String(name || '').trim().slice(0, 20);
    const cleanAvatar = String(avatar || '🦊').slice(0, 4);

    if (cleanName) localStorage.setItem(LS_NAME, cleanName);
    else           localStorage.removeItem(LS_NAME);

    localStorage.setItem(LS_AVATAR, cleanAvatar);

    return { name: cleanName, avatar: cleanAvatar };
  }

  function hasProfile() {
    return !!localStorage.getItem(LS_NAME);
  }

  /* ══════════════════════════════════════════
     API اصلی
     ══════════════════════════════════════════ */
  window.ArcadeAPI = {
    getProfile,
    setProfile,
    hasProfile,

    saveScore: function (gameId, score, opts) {
      opts = opts || {};
      const profile = getProfile();

      const meta = Object.assign(
        { avatar: profile.avatar || null },
        opts.meta || {}
      );

      const payload = {
        game: String(gameId),
        score: Math.max(0, Math.floor(Number(score) || 0)),
        playerName: opts.playerName || profile.name || 'بازیکن',
        meta
      };

      return fetch('api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
    },

    fetchPlayerStats: function (name) {
      if (!name) return Promise.resolve(null);
      return fetch('api/player-stats?name=' + encodeURIComponent(name), { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);
    }
  };
})();