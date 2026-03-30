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
