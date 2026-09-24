import { Database } from "bun:sqlite";
import { serve, file } from "bun";

// ═══ ۱. دیتابیس ═══
const db = new Database("arcade.db");

db.run(`
  CREATE TABLE IF NOT EXISTS scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    game        TEXT    NOT NULL,
    player_name TEXT    NOT NULL DEFAULT 'بازیکن',
    score       INTEGER NOT NULL,
    meta        TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_scores_game_score
  ON scores(game, score DESC)
`);

// ═══ ۲. سرور ═══
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
};

const server = serve({
  port: 3000,

  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    // ─── WebSocket Upgrade ───
    if (path === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { room: null, playerId: crypto.randomUUID() },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // ─── API: ثبت امتیاز ───
    if (path === "/api/score" && req.method === "POST") {
      try {
        const body = await req.json();
        const { game, playerName, score, meta } = body;

        if (!game || typeof score !== "number") {
          return Response.json(
            { error: "game و score الزامی هستند" },
            { status: 400 }
          );
        }

        const insert = db.query(`
          INSERT INTO scores (game, player_name, score, meta)
          VALUES ($game, $name, $score, $meta)
          RETURNING id, game, player_name, score, created_at
        `);

        const row = insert.get({
          $game: game,
          $name: playerName || "بازیکن",
          $score: Math.floor(score),
          $meta: meta ? JSON.stringify(meta) : null,
        });

        return Response.json({ ok: true, record: row });
      } catch (e) {
        return Response.json({ error: "خطای سرور" }, { status: 500 });
      }
    }

    // ─── API: لیدربورد هر بازی ───
    if (path === "/api/leaderboard" && req.method === "GET") {
      const game = url.searchParams.get("game");
      const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50);

      if (!game) {
        return Response.json(
          { error: "پارامتر game الزامی است" },
          { status: 400 }
        );
      }

      const rows = db.query(`
        SELECT player_name, score, created_at
        FROM scores
        WHERE game = $game
        ORDER BY score DESC
        LIMIT $limit
      `).all({ $game: game, $limit: limit });

      return Response.json({ game, leaderboard: rows });
    }

    // ─── API: آمار کلی ───
    if (path === "/api/stats" && req.method === "GET") {
      const stats = db.query(`
        SELECT
          game,
          COUNT(*)       AS plays,
          MAX(score)     AS best,
          AVG(score)     AS avg
        FROM scores
        GROUP BY game
        ORDER BY plays DESC
      `).all();

      return Response.json({ stats });
    }

    // ─── Static Files ───
    let filePath = path === "/" ? "/arcade.html" : path;
    const fullPath = `${import.meta.dir}/public${filePath}`;

    const f = file(fullPath);
    if (await f.exists()) {
      const ext = filePath.substring(filePath.lastIndexOf("."));
      return new Response(f, {
        headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
      });
    }

    return new Response("404 - پیدا نشد", { status: 404 });
  },

  // ═══ ۳. WebSocket Handler ═══
  websocket: {
    open(ws) {
      console.log(`[WS] Connected: ${ws.data.playerId}`);
      ws.send(JSON.stringify({
        type: "welcome",
        playerId: ws.data.playerId,
      }));
    },

    message(ws, raw) {
      try {
        const msg = JSON.parse(String(raw));

        switch (msg.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
            break;

          case "join_room": {
            const room = msg.room || "default";
            ws.data.room = room;
            ws.subscribe(room);
            ws.publish(room, JSON.stringify({
              type: "player_joined",
              playerId: ws.data.playerId,
              players: server.subscriberCount(room),
            }));
            break;
          }

          case "game_state": {
            if (ws.data.room) {
              ws.publish(ws.data.room, raw);
            }
            break;
          }

          case "leave_room": {
            if (ws.data.room) {
              ws.unsubscribe(ws.data.room);
              ws.publish(ws.data.room, JSON.stringify({
                type: "player_left",
                playerId: ws.data.playerId,
              }));
              ws.data.room = null;
            }
            break;
          }
        }
      } catch {
        // پیام نامعتبر — نادیده بگیر
      }
    },

    close(ws) {
      console.log(`[WS] Disconnected: ${ws.data.playerId}`);
      if (ws.data.room) {
        ws.publish(ws.data.room, JSON.stringify({
          type: "player_left",
          playerId: ws.data.playerId,
        }));
      }
    },
  },
});

console.log(`🎮 Arcade Hub running at http://localhost:${server.port}`);