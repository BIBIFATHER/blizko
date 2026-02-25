import { WebSocketServer } from "ws";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const wss = new WebSocketServer({ port: PORT });

let client = null;

wss.on("connection", (ws) => {
  client = ws;
  console.log("[autobot] plugin connected");

  ws.on("close", () => {
    if (client === ws) client = null;
    console.log("[autobot] plugin disconnected");
  });

  ws.on("message", (data) => {
    // пока просто логируем ответы, следующий шаг — сделать MCP tools
    console.log("[autobot] plugin msg:", String(data).slice(0, 200));
  });
});

console.log(`[autobot] WS server listening on ws://127.0.0.1:${PORT}`);
