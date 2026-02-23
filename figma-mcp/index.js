#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const FIGMA_API = "https://api.figma.com/v1";

function getToken() {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN is not set");
  return token;
}

async function figmaFetch(path, params = {}) {
  const url = new URL(`${FIGMA_API}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) url.searchParams.set(k, v.join(","));
    else url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    headers: { "X-Figma-Token": getToken() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API error ${res.status}: ${text}`);
  }
  return res.json();
}

function walk(node, cb) {
  cb(node);
  if (node.children) node.children.forEach((c) => walk(c, cb));
}

const server = new McpServer({
  name: "figma-mcp",
  version: "0.1.0",
});

server.tool(
  "figma.readFile",
  { fileKey: z.string(), depth: z.number().int().optional() },
  async ({ fileKey, depth }) => {
    const data = await figmaFetch(`/files/${fileKey}`, { depth });
    return { content: [{ type: "json", json: data }] };
  }
);

server.tool(
  "figma.getNodes",
  { fileKey: z.string(), nodeIds: z.array(z.string()) },
  async ({ fileKey, nodeIds }) => {
    const data = await figmaFetch(`/files/${fileKey}/nodes`, {
      ids: nodeIds,
    });
    return { content: [{ type: "json", json: data }] };
  }
);

server.tool(
  "figma.export",
  {
    fileKey: z.string(),
    nodeIds: z.array(z.string()),
    format: z.enum(["png", "jpg", "svg", "pdf"]).optional(),
    scale: z.number().optional(),
    use_absolute_bounds: z.boolean().optional(),
  },
  async ({ fileKey, nodeIds, format = "png", scale = 2, use_absolute_bounds }) => {
    const data = await figmaFetch(`/images/${fileKey}`, {
      ids: nodeIds,
      format,
      scale,
      use_absolute_bounds,
    });
    return { content: [{ type: "json", json: data }] };
  }
);

server.tool(
  "figma.find",
  {
    fileKey: z.string(),
    query: z.string(),
    depth: z.number().int().optional(),
    maxResults: z.number().int().optional(),
  },
  async ({ fileKey, query, depth = 10, maxResults = 50 }) => {
    const data = await figmaFetch(`/files/${fileKey}`, { depth });
    const hits = [];
    const q = query.toLowerCase();
    walk(data.document, (node) => {
      if (hits.length >= maxResults) return;
      const name = node.name || "";
      if (name.toLowerCase().includes(q)) {
        hits.push({ id: node.id, name: node.name, type: node.type });
      }
    });
    return { content: [{ type: "json", json: { hits } }] };
  }
);

server.tool(
  "figma.makePatch",
  {
    summary: z.string(),
    changes: z.array(z.object({ nodeId: z.string().optional(), action: z.string(), details: z.string().optional() })).optional(),
  },
  async ({ summary, changes = [] }) => {
    // This tool only returns a patch plan (does not apply changes in Figma)
    return { content: [{ type: "json", json: { summary, changes } }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
