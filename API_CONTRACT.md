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

### Request (Text)

```json
{
  "prompt": "string",
  "messages": [{"role":"user","content":"string"}],
  "responseMimeType": "string (optional)",
  "responseSchema": "object (optional)"
}
```

### Request (Image)

Use `prompt` or `messages` and embed the image as a data URL marker:

```
<text>
[image_data_url]data:image/png;base64,AAAA...
```

The server parses `[image_data_url]` from the **user** content and splits text + image.

### Image field format

Only **data URL** is supported:
`data:image/png;base64,...` or `data:image/jpeg;base64,...`

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
- Parse `[image_data_url]` from user content when present.
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
  -d '{"prompt":"Say hi"}'
```

### curl (image)

```bash
curl -s http://localhost:5173/api/ai \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is on the document? [image_data_url]data:image/jpeg;base64,/9j/4AAQ..."}'
```
