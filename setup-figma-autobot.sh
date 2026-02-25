#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/Desktop/blizko 3"
BOT="$ROOT/figma-autobot"
PLUGIN="$BOT/plugin"
MCP="$BOT/mcp"

mkdir -p "$PLUGIN" "$MCP"

# ---------------------------
# Figma Plugin
# ---------------------------
cat > "$PLUGIN/manifest.json" <<'JSON'
{
  "name": "Blizko Autobot",
  "id": "blizko-autobot",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"]
}
JSON

cat > "$PLUGIN/ui.html" <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Blizko Autobot</title>
    <style>
      body { font: 12px/1.4 -apple-system, system-ui, sans-serif; padding: 12px; }
      .row { margin: 6px 0; }
      code { background: #f2f2f2; padding: 2px 4px; border-radius: 4px; }
      .ok { color: #0a7; }
      .bad { color: #a00; }
    </style>
  </head>
  <body>
    <div class="row"><b>Blizko Autobot</b></div>
    <div class="row">WS: <code id="wsUrl">ws://127.0.0.1:8787</code></div>
    <div class="row">Status: <span id="st" class="bad">disconnected</span></div>
    <div class="row"><button id="reconnect">Reconnect</button></div>

    <script>
      const wsUrl = "ws://127.0.0.1:8787";
      document.getElementById("wsUrl").textContent = wsUrl;
      const st = document.getElementById("st");

      let ws;

      function setStatus(ok, text){
        st.className = ok ? "ok" : "bad";
        st.textContent = text;
      }

      function connect(){
        try { if (ws) ws.close(); } catch {}
        ws = new WebSocket(wsUrl);

        ws.onopen = () => setStatus(true, "connected");
        ws.onclose = () => setStatus(false, "disconnected");
        ws.onerror = () => setStatus(false, "error");

        ws.onmessage = (ev) => {
          parent.postMessage({ pluginMessage: { type: "autobot_cmd", payload: ev.data } }, "*");
        };
      }

      window.onmessage = (ev) => {
        const msg = ev.data?.pluginMessage;
        if (!msg) return;
        if (msg.type === "autobot_resp" && ws && ws.readyState === 1) {
          ws.send(JSON.stringify(msg.payload));
        }
      };

      document.getElementById("reconnect").onclick = connect;
      connect();
    </script>
  </body>
</html>
HTML

cat > "$PLUGIN/code.js" <<'JS'
figma.showUI(__html__, { width: 360, height: 180 });

function ok(id, result) {
  figma.ui.postMessage({ type: "autobot_resp", payload: { id, ok: true, result } });
}

function fail(id, error) {
  figma.ui.postMessage({ type: "autobot_resp", payload: { id, ok: false, error: String(error?.message || error) } });
}

function findOne(query) {
  const all = figma.currentPage.findAll(n => typeof n.name === "string");
  const exact = all.find(n => n.name === query);
  if (exact) return exact;
  const contains = all.find(n => n.name.toLowerCase().includes(query.toLowerCase()));
  return contains || null;
}

async function handle(cmd) {
  const { id, op, args } = cmd;

  try {
    if (op === "ping") return ok(id, { pong: true, page: figma.currentPage.name });

    if (op === "createFrame") {
      const { name, width, height } = args;
      const f = figma.createFrame();
      f.name = name;
      f.resize(width, height);
      figma.currentPage.appendChild(f);
      return ok(id, { nodeId: f.id });
    }

    if (op === "setText") {
      const { nodeId, text } = args;
      const n = figma.getNodeById(nodeId);
      if (!n || n.type !== "TEXT") throw new Error("Node not found or not TEXT");
      await figma.loadFontAsync(n.fontName);
      n.characters = text;
      return ok(id, { nodeId });
    }

    if (op === "createText") {
      const { parentId, name, text } = args;
      const p = figma.getNodeById(parentId);
      if (!p || !("appendChild" in p)) throw new Error("Parent not found");
      const t = figma.createText();
      t.name = name;
      await figma.loadFontAsync(t.fontName);
      t.characters = text || "";
      p.appendChild(t);
      return ok(id, { nodeId: t.id });
    }

    if (op === "setAutoLayout") {
      const { nodeId, mode, padding, spacing } = args;
      const n = figma.getNodeById(nodeId);
      if (!n || (n.type !== "FRAME" && n.type !== "COMPONENT" && n.type !== "INSTANCE")) {
        throw new Error("Node not found or not layout-capable");
      }
      n.layoutMode = mode; // "VERTICAL" | "HORIZONTAL"
      if (padding) {
        n.paddingTop = padding.top ?? n.paddingTop;
        n.paddingRight = padding.right ?? n.paddingRight;
        n.paddingBottom = padding.bottom ?? n.paddingBottom;
        n.paddingLeft = padding.left ?? n.paddingLeft;
      }
      if (typeof spacing === "number") n.itemSpacing = spacing;
      return ok(id, { nodeId });
    }

    if (op === "findByName") {
      const { name } = args;
      const n = findOne(name);
      return ok(id, { nodeId: n ? n.id : null, found: !!n });
    }

    throw new Error("Unknown op: " + op);
  } catch (e) {
    return fail(id, e);
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg?.type !== "autobot_cmd") return;
  let cmd;
  try { cmd = JSON.parse(msg.payload); } catch (e) { return; }
  if (!cmd || !cmd.id || !cmd.op) return;
  await handle(cmd);
};
JS

# ---------------------------
# WS bridge (simple)
# ---------------------------
cat > "$MCP/package.json" <<'JSON'
{
  "name": "blizko-figma-autobot-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.mjs"
  },
  "dependencies": {
    "ws": "^8.18.0"
  }
}
JSON

cat > "$MCP/server.mjs" <<'JS'
import { WebSocketServer } from "ws";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const wss = new WebSocketServer({ port: PORT });

let client = null;
const pending = new Map();

function sendCmd(op, args = {}) {
  if (!client) throw new Error("No Figma plugin connected (open plugin UI to connect).");
  const id = crypto.randomUUID();
  const payload = JSON.stringify({ id, op, args });
  client.send(payload);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Timeout waiting for plugin response: " + op));
    }, 15000);
    pending.set(id, { resolve, reject, t });
  });
}

wss.on("connection", (ws) => {
  client = ws;
  console.log("[autobot] plugin connected");
  ws.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(String(data)); } catch { return; }
    const p = pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.t);
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error || "Unknown error"));
  });

  ws.on("close", () => {
    if (client === ws) client = null;
    console.log("[autobot] plugin disconnected");
  });
});

console.log(`[autobot] WS server listening on ws://127.0.0.1:${PORT}`);
JS

echo "✅ Created figma-autobot in: $BOT"
echo "Next:"
echo "  cd \"$MCP\" && npm i"
echo "  npm run start"
echo "  In Figma: Plugins -> Development -> Import plugin from manifest... -> $PLUGIN/manifest.json"
