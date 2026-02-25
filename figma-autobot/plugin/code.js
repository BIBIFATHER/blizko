figma.showUI(__html__, { width: 360, height: 180 });

function ok(id, result) {
  figma.ui.postMessage({ type: "autobot_resp", payload: { id, ok: true, result } });
}
function fail(id, error) {
  figma.ui.postMessage({ type: "autobot_resp", payload: { id, ok: false, error: String(error?.message || error) } });
}
function findOne(query) {
  const all = figma.currentPage.findAll(n => typeof n.name === "string");
  return all.find(n => n.name === query) || all.find(n => n.name.toLowerCase().includes(query.toLowerCase())) || null;
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

    if (op === "setText") {
      const { nodeId, text } = args;
      const n = figma.getNodeById(nodeId);
      if (!n || n.type !== "TEXT") throw new Error("Node not found or not TEXT");
      await figma.loadFontAsync(n.fontName);
      n.characters = text;
      return ok(id, { nodeId });
    }

    if (op === "setAutoLayout") {
      const { nodeId, mode, padding, spacing } = args;
      const n = figma.getNodeById(nodeId);
      if (!n || (n.type !== "FRAME" && n.type !== "COMPONENT" && n.type !== "INSTANCE")) {
        throw new Error("Node not found or not layout-capable");
      }
      n.layoutMode = mode;
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
  try { cmd = JSON.parse(msg.payload); } catch { return; }
  if (!cmd?.id || !cmd?.op) return;
  await handle(cmd);
};
