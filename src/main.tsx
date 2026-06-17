import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
// Self-hosted fonts (BLI-122): bundled by Vite, no IP egress to Google Fonts.
// Inter (body) + Playfair Display (headlines), weights 400/500/600/700.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import '../index.css';
import App from '../App';
import { setStorageAdapter } from '@/core/platform/storage';
import { webStorageAdapter } from '@/web/platform/storage.web';
import { scrubEvent, scrubBreadcrumb, filterSentryIntegrations } from '@/services/sentryScrub';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Error reporting only. Performance tracing and Session Replay are DISABLED
    // until RU-core: http.client spans carry geocode address/GPS query strings
    // and replay records PD-heavy forms (passport/medical/child). For a closed
    // PD-sensitive app their debugging value does not outweigh the egress risk
    // before legal/security acceptance. Re-enable with span/replay scrubbing
    // (beforeSendTransaction/beforeSendSpan) post-RU-core.
    //
    // Also drop the default BrowserSession integration: release-health sessions
    // egress non-error envelopes (sid / user-agent / env) that bypass beforeSend.
    integrations: filterSentryIntegrations,
    tracesSampleRate: 0,
    // Hard guarantee: even if a sample rate is later raised, no transaction or
    // performance event leaves the browser.
    beforeSendTransaction: () => null,
    // Never attach default PII (ip, cookies, headers). Scrub every error event
    // and breadcrumb before egress to Sentry's DE ingest.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

// Set web platform adapters (Expo will provide native adapters later)
setStorageAdapter(webStorageAdapter);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

import { HelmetProvider } from 'react-helmet-async';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
