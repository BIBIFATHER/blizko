# stitch-mcp-server

Local MCP server for inspecting public Stitch preview URLs.

## Tools

- `stitch_capture_preview`
  - Opens a `https://stitch.withgoogle.com/preview/...` page in headless Chromium
  - Waits for render
  - Returns visible text, console messages, and a PNG screenshot

## Local run

```bash
cd stitch-mcp-server
npm install
npm start
```

## MCP config

The workspace root includes a `.mcp.json` entry for this server.
