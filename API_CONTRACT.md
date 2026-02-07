# API_CONTRACT.md

## Overview

Blizko uses a server-side AI proxy endpoint to keep model keys and providers off the client.

Client code calls a single endpoint: `POST /api/ai`.

This contract is intentionally simple:
- Client always expects `{ text: string }`
- Errors always return `{ error: string }` with non-2xx status

---

## Endpoint

### POST /api/ai

**Content-Type:** `application/json`

### Request (Text mode)

```json
{
  "mode": "text",
  "prompt": "string",
  "systemPrompt": "string (optional)",
  "temperature": 0.7,
  "model": "string (optional)"
}
```

### Request (Image mode)

```json
{
  "mode": "image",
  "prompt": "string",
  "image": "dataURL or base64 string",
  "systemPrompt": "string (optional)",
  "temperature": 0.7,
  "model": "string (optional)"
}
```

### Image field format

`image` can be either:
- Data URL: `data:image/png;base64,iVBORw0KGgo...`
- Base64 only: `iVBORw0KGgo...`

The server should accept both (recommended).
If server only supports one format, document it here and normalize on the client.

### Response

#### Success (200)

```json
{ "text": "string" }
```

#### Error (4xx/5xx)

```json
{ "error": "string" }
```

## Behavior rules (server)
- Must never expose provider API keys to the client.
- Must validate `mode` (`text` or `image`) and required fields.
- Should set reasonable timeouts.
- Should normalize provider responses to `{ text }`.
- Should log errors (without leaking secrets).

## Client expectations

Client functions in `src/core/ai/aiGateway.ts`:
- `aiText(prompt, options?) -> Promise<string>`
- `aiImage(prompt, image, options?) -> Promise<string>`

They must call `/api/ai` and return `data.text`.
They must throw on non-2xx or missing text.

## Example calls

### curl (text)

```bash
curl -s http://localhost:5173/api/ai \
  -H "Content-Type: application/json" \
  -d '{"mode":"text","prompt":"Say hi","temperature":0.7}'
```

### curl (image)

```bash
curl -s http://localhost:5173/api/ai \
  -H "Content-Type: application/json" \
  -d '{"mode":"image","prompt":"What is on the document?","image":"data:image/jpeg;base64,/9j/4AAQ...","temperature":0.2}'
```
