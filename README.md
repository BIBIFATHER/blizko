<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VjavTyPGrzKSbVosRedRCQFMJEPD_9-Y

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Local Env Workflow

Keep secrets in `.env.local` only. Do not copy project secrets into `~/.zshrc` or other global shell files.

### One-off commands

Use the env wrapper when a command depends on local secrets:

```bash
bash scripts/with-env.sh npm run dev
bash scripts/with-env.sh npm run build
bash scripts/with-env.sh vercel whoami
bash scripts/with-env.sh supabase projects list
```

### Interactive shell session

If you need the variables in the current terminal tab:

```bash
source scripts/source-env.sh
```

To load a different file:

```bash
source scripts/source-env.sh .env.staging
```

### Quick validation

Check required variables without printing secret values:

```bash
npm run env:doctor:local
```

## Управление проектом
OpenClaw (офис управления, RFC, системные документы) вынесен в отдельный репозиторий и не хранится в этом коде.
