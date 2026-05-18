# OPEN QUESTIONS & UNVERIFIED LOGIC

## 1. Analytics & Event Tracking
- **Status**: INFERRED
- **Details**: Exact payload structures for analytics events (e.g., `trackAuthModalOpen`, `trackLanguageSwitch` exported from `src/services/analytics.ts`) have not been explicitly extracted. The baseline assumptions about their payloads are inferred.

## 2. Server-side / Edge Function Matching Logic
- **Status**: UNVERIFIED
- **Details**: While `useMatchResults` hook processing has been documented, the exact raw data pipeline yielding `score`, `RiskEngine` flags, and `AI Human Explanations` from Gemini are presumably wrapped in an edge function or a backend RPC. Their explicit code is unverified and assumed.

## 3. PWA Offline Flow
- **Status**: INFERRED
- **Details**: Capacitor and PWA installations are tracked and handled via `InstallPwaPrompt.tsx` and `sw.js`. Exact behavior in airplane mode beyond immediate network error toasts is INFERRED.
