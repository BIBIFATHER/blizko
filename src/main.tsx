import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import * as Sentry from '@sentry/react';
import '../index.css';
import App from '../App';
import { setStorageAdapter } from '@/core/platform/storage';
import { webStorageAdapter } from '@/web/platform/storage.web';
import { scrubEvent, scrubBreadcrumb } from '@/services/sentryScrub';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Session Replay is PD-sensitive (forms with child/contact/document data):
      // mask all text + inputs, block media, and never capture request/response
      // bodies. Explicit so the privacy posture is verified, not relied on as a
      // default (DATA_REGISTER: payload scrubbing must be verified).
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        networkDetailAllowUrls: [],
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    // Never attach default PII (ip, cookies, headers). Scrub every event and
    // breadcrumb before egress to Sentry's DE ingest.
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
