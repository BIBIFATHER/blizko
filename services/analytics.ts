/**
 * Blizko Analytics — PostHog + Custom Events
 * Универсальный модуль аналитики для воронки конверсий.
 * 
 * Воронка:
 * 1. page_view (landing)
 * 2. cta_clicked (Найти няню / Стать няней)
 * 3. form_step_completed (step 1..4)
 * 4. form_submitted (parent / nanny)
 * 5. matching_results_viewed
 * 6. nanny_card_clicked
 * 7. chat_opened
 * 8. booking_created
 */

import { getItem, setItem } from '../src/core/platform/storage';

// PostHog types (inline to avoid dependency)
interface PostHogInstance {
    capture: (event: string, properties?: Record<string, unknown>) => void;
    identify: (id: string, properties?: Record<string, unknown>) => void;
    reset: () => void;
    opt_out_capturing: () => void;
    opt_in_capturing: () => void;
}

declare global {
    interface Window {
        posthog?: PostHogInstance;
    }
}

const ANALYTICS_BUFFER_KEY = 'blizko_analytics_events';
const ANALYTICS_SESSION_KEY = 'blizko_analytics_session_id';
const ANALYTICS_BUFFER_LIMIT = 500;
const ANALYTICS_FLUSH_URL = '/api/data?resource=analytics';

export interface AnalyticsEventRecord {
    id?: string;
    event: string;
    properties: Record<string, unknown>;
    timestamp: string;
    url?: string;
}

// ---- Event Names (type-safe) ----
export const ANALYTICS_EVENTS = {
    // Funnel
    PAGE_VIEW: 'page_view',
    CTA_CLICKED: 'cta_clicked',
    FORM_STEP_COMPLETED: 'form_step_completed',
    FORM_SUBMITTED: 'form_submitted',
    MATCHING_RESULTS_VIEWED: 'matching_results_viewed',
    NANNY_CARD_CLICKED: 'nanny_card_clicked',
    CHAT_OPENED: 'chat_opened',
    BOOKING_CREATED: 'booking_created',
    RETURN_VISIT: 'return_visit',
    DOCUMENT_UPLOADED: 'document_uploaded',
    LOCATION_DETECTED: 'location_detected',
    RESUME_PARSED: 'resume_parsed',
    RESUME_AUTOFILL_APPLIED: 'resume_autofill_applied',
    NANNY_READY_FOR_MATCH: 'nanny_ready_for_match',
    MATCH_PROFILE_OPENED: 'match_profile_opened',
    MATCH_FOLLOW_UP_SHOWN: 'match_follow_up_shown',
    MATCH_FOLLOW_UP_CLICKED: 'match_follow_up_clicked',

    // Engagement
    SHARE_CLICKED: 'share_clicked',
    AUTH_MODAL_OPENED: 'auth_modal_opened',
    AUTH_COMPLETED: 'auth_completed',
    LANGUAGE_SWITCHED: 'language_switched',
    INSTALL_PROMPT_SHOWN: 'install_prompt_shown',
    INSTALL_ACCEPTED: 'install_accepted',
    NANNY_OFFER_SHOWN: 'nanny_offer_shown',
    NANNY_OFFER_ACCEPTED: 'nanny_offer_accepted',

    // Admin
    ADMIN_PANEL_OPENED: 'admin_panel_opened',
} as const;

type EventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

function generateAnalyticsId(): string {
    try {
        if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
            return globalThis.crypto.randomUUID();
        }
    } catch {
        // ignore
    }

    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getAnalyticsSessionId(): string {
    try {
        if (typeof window === 'undefined') return 'server';

        const existing = getItem(ANALYTICS_SESSION_KEY);
        if (existing) return existing;

        const next = generateAnalyticsId();
        setItem(ANALYTICS_SESSION_KEY, next);
        return next;
    } catch {
        return 'unknown-session';
    }
}

function appendAnalyticsEvent(record: AnalyticsEventRecord): void {
    try {
        if (typeof window === 'undefined') return;
        const raw = getItem(ANALYTICS_BUFFER_KEY);
        const existing = raw ? JSON.parse(raw) as AnalyticsEventRecord[] : [];
        const next = [...existing, record].slice(-ANALYTICS_BUFFER_LIMIT);
        setItem(ANALYTICS_BUFFER_KEY, JSON.stringify(next));
    } catch {
        // ignore local analytics buffer failures
    }
}

export function getAnalyticsEvents(): AnalyticsEventRecord[] {
    try {
        if (typeof window === 'undefined') return [];
        const raw = getItem(ANALYTICS_BUFFER_KEY);
        return raw ? JSON.parse(raw) as AnalyticsEventRecord[] : [];
    } catch {
        return [];
    }
}

async function flushAnalyticsEvent(record: AnalyticsEventRecord): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;

    try {
        await fetch(ANALYTICS_FLUSH_URL, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ record }),
        });
    } catch {
        // remote analytics should never break UX
    }
}

export async function fetchRemoteAnalyticsEvents(days = 30, accessToken?: string): Promise<AnalyticsEventRecord[]> {
    try {
        const headers: Record<string, string> = {};
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${ANALYTICS_FLUSH_URL}&days=${days}`, { headers });
        if (!response.ok) return [];

        const data = await response.json().catch(() => ({ items: [] }));
        return Array.isArray(data?.items) ? data.items as AnalyticsEventRecord[] : [];
    } catch {
        return [];
    }
}

// ---- Core Functions ----

/** Track an event with optional properties */
export function track(event: EventName, properties?: Record<string, unknown>): void {
    try {
        const sessionId = getAnalyticsSessionId();
        const record: AnalyticsEventRecord = {
            id: generateAnalyticsId(),
            event,
            properties: {
                session_id: sessionId,
                ...(properties || {}),
            },
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.pathname : undefined,
        };

        appendAnalyticsEvent(record);
        void flushAnalyticsEvent(record);

        // PostHog
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture(event, {
                ...record.properties,
                timestamp: record.timestamp,
                url: record.url,
            });
        }

        // Console log in dev mode
        if (import.meta.env.DEV) {
            console.log(`📊 [Analytics] ${event}`, properties || '');
        }
    } catch {
        // Analytics should never break the app
    }
}

/** Identify a user (after login/signup) */
export function identify(userId: string, traits?: Record<string, unknown>): void {
    try {
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.identify(userId, traits);
        }
        if (import.meta.env.DEV) {
            console.log(`📊 [Analytics] identify:`, userId, traits);
        }
    } catch {
        // silently fail
    }
}

/** Reset user identity (on logout) */
export function resetIdentity(): void {
    try {
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.reset();
        }
    } catch {
        // silently fail
    }
}

// ---- Convenience Helpers ----

/** Track a page view */
export function trackPageView(pageName: string): void {
    track(ANALYTICS_EVENTS.PAGE_VIEW, { page: pageName });
}

/** Track CTA click */
export function trackCTA(buttonName: string, location: string): void {
    track(ANALYTICS_EVENTS.CTA_CLICKED, { button: buttonName, location });
}

export function trackOfferAccepted(offerType: 'parent' | 'nanny'): void {
    track(ANALYTICS_EVENTS.FORM_SUBMITTED, { offer_type: offerType, source: 'offer_accept' });
}

export function trackParentFormStarted(): void {
    track(ANALYTICS_EVENTS.PAGE_VIEW, { page: 'parent_form', source: 'form_start' });
}

/** Track form step completion */
export function trackFormStep(formType: 'parent' | 'nanny', step: number, stepName: string): void {
    track(ANALYTICS_EVENTS.FORM_STEP_COMPLETED, {
        form_type: formType,
        step,
        step_name: stepName
    });
}

/** Track form submission */
export function trackFormSubmit(formType: 'parent' | 'nanny'): void {
    track(ANALYTICS_EVENTS.FORM_SUBMITTED, { form_type: formType });
}

/** Track matching results */
export function trackMatchingResults(candidateCount: number, topScore: number): void {
    track(ANALYTICS_EVENTS.MATCHING_RESULTS_VIEWED, {
        candidate_count: candidateCount,
        top_score: topScore
    });
}

/** Track nanny card click */
export function trackNannyCardClick(nannyName: string, position: number, score: number): void {
    track(ANALYTICS_EVENTS.NANNY_CARD_CLICKED, {
        nanny_name: nannyName,
        position,
        score
    });
}

export function trackShare(location: string): void {
    track(ANALYTICS_EVENTS.SHARE_CLICKED, { location });
}

export function trackAuthModalOpen(source: string): void {
    track(ANALYTICS_EVENTS.AUTH_MODAL_OPENED, { source });
}

export function trackLanguageSwitch(language: 'ru' | 'en'): void {
    track(ANALYTICS_EVENTS.LANGUAGE_SWITCHED, { language });
}

export function trackChatOpen(source: string): void {
    track(ANALYTICS_EVENTS.CHAT_OPENED, { source });
}

export function trackReturnVisit(daysSinceLast: number): void {
    track(ANALYTICS_EVENTS.RETURN_VISIT, { days_since_last: daysSinceLast });
}

export function trackDocumentUploaded(owner: 'parent' | 'nanny', documentType: string): void {
    track(ANALYTICS_EVENTS.DOCUMENT_UPLOADED, { owner, document_type: documentType });
}

export function trackLocationDetected(owner: 'parent' | 'nanny'): void {
    track(ANALYTICS_EVENTS.LOCATION_DETECTED, { owner, method: 'geolocation' });
}

export function trackResumeParsed(confidence: number, appliedFieldsCount: number): void {
    track(ANALYTICS_EVENTS.RESUME_PARSED, {
        confidence,
        applied_fields_count: appliedFieldsCount,
    });
}

export function trackResumeAutofillApplied(appliedFieldsCount: number): void {
    track(ANALYTICS_EVENTS.RESUME_AUTOFILL_APPLIED, {
        applied_fields_count: appliedFieldsCount,
    });
}

export function trackNannyFormStarted(): void {
    track(ANALYTICS_EVENTS.PAGE_VIEW, { page: 'nanny_form', source: 'form_start' });
}

export function trackNannyFormStep(step: number, stepName: string): void {
    track(ANALYTICS_EVENTS.FORM_STEP_COMPLETED, {
        form_type: 'nanny',
        step,
        step_name: stepName,
    });
}

export function trackNannyOfferShown(): void {
    track(ANALYTICS_EVENTS.NANNY_OFFER_SHOWN);
}

export function trackNannyOfferAccepted(): void {
    track(ANALYTICS_EVENTS.NANNY_OFFER_ACCEPTED);
}

export function trackNannyReadyForMatch(score: number): void {
    track(ANALYTICS_EVENTS.NANNY_READY_FOR_MATCH, { quality_score: score });
}

export function trackMatchProfileOpen(nannyId: string, position: number, score: number): void {
    track(ANALYTICS_EVENTS.MATCH_PROFILE_OPENED, {
        nanny_id: nannyId,
        position,
        score,
    });
}

export function trackMatchFollowUpShown(stage: 'fresh' | 'engaged'): void {
    track(ANALYTICS_EVENTS.MATCH_FOLLOW_UP_SHOWN, { stage });
}

export function trackMatchFollowUpClicked(stage: 'fresh' | 'engaged'): void {
    track(ANALYTICS_EVENTS.MATCH_FOLLOW_UP_CLICKED, { stage });
}

export function trackBookingCreated(parentId: string, nannyId: string): void {
    track(ANALYTICS_EVENTS.BOOKING_CREATED, {
        parent_id: parentId,
        nanny_id: nannyId,
    });
}
