/* score.js — پل ارتباطی بازیها با بکاند Bun */
(function () {
  'use strict';

  if (window.ArcadeAPI) return;   // جلوگیری از بارگذاری دوباره

  window.ArcadeAPI = {
    /**
     * ذخیرهی امتیاز در سرور (fire-and-forget)
     * @param {string} gameId  — شناسهی بازی: balloon, pancake, simon, snake, pong, pony
     * @param {number} score   — امتیاز (هر عددی)
     * @param {object} [opts]  — اختیاری: { playerName, meta }
     * @returns {Promise}      — هرگز reject نمیشه، همیشه resolve می‌کنه
     */
    saveScore: function (gameId, score, opts) {
      opts = opts || {};
      var payload = {
        game: String(gameId),
        score: Math.max(0, Math.floor(Number(score) || 0)),
        playerName: opts.playerName || localStorage.getItem('arcade_player') || 'بازیکن',
        meta: opts.meta || null
      };

      return fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });   // سوگند به بیصدا بودن
    },

    /**
     * یک بار برای همیشه اسم بازیکن رو می‌پرسه
     */
    askPlayerName: function () {
      var current = localStorage.getItem('arcade_player');
      if (current) return current;
      var name = prompt('اسمت چیه؟ (برای جدول امتیازات)', 'بازیکن');
      if (name && name.trim()) {
        localStorage.setItem('arcade_player', name.trim().slice(0, 20));
        return name.trim();
      }
      return null;
    }
  };
})();