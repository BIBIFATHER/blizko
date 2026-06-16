import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as analytics from '@/services/analytics';

const UUID_A = '550e8400-e29b-41d4-a716-446655440000';
const UUID_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

/**
 * Drift guard (BLI-116): every track* helper must emit a property payload whose
 * keys are all declared in ANALYTICS_EVENT_PROPERTIES. If a helper adds a key
 * that the schema does not allow, the schema silently drops it — this test then
 * fails because an expected key is missing from the captured payload.
 */
const cases: Array<{ name: string; run: () => void; expectedKeys: string[] }> = [
  { name: 'trackPageView', run: () => analytics.trackPageView('home'), expectedKeys: ['page'] },
  {
    name: 'trackCTA',
    run: () => analytics.trackCTA('find_nanny', 'hero'),
    expectedKeys: ['button', 'location'],
  },
  {
    name: 'trackOfferAccepted',
    run: () => analytics.trackOfferAccepted('parent'),
    expectedKeys: ['offer_type', 'source'],
  },
  {
    name: 'trackParentFormStarted',
    run: () => analytics.trackParentFormStarted(),
    expectedKeys: ['page', 'source'],
  },
  {
    name: 'trackFormStep',
    run: () => analytics.trackFormStep('parent', 1, 'basics'),
    expectedKeys: ['form_type', 'step', 'step_name'],
  },
  {
    name: 'trackFormSubmit',
    run: () => analytics.trackFormSubmit('parent'),
    expectedKeys: ['form_type'],
  },
  {
    name: 'trackMatchingResults',
    run: () => analytics.trackMatchingResults(3, 90),
    expectedKeys: ['candidate_count', 'top_score'],
  },
  {
    name: 'trackNannyCardClick',
    run: () => analytics.trackNannyCardClick('ignored', 2, 80),
    expectedKeys: ['position', 'score'],
  },
  { name: 'trackShare', run: () => analytics.trackShare('footer'), expectedKeys: ['location'] },
  {
    name: 'trackAuthModalOpen',
    run: () => analytics.trackAuthModalOpen('cta'),
    expectedKeys: ['source'],
  },
  {
    name: 'trackLanguageSwitch',
    run: () => analytics.trackLanguageSwitch('ru'),
    expectedKeys: ['language'],
  },
  { name: 'trackChatOpen', run: () => analytics.trackChatOpen('header'), expectedKeys: ['source'] },
  {
    name: 'trackReturnVisit',
    run: () => analytics.trackReturnVisit(5),
    expectedKeys: ['days_since_last'],
  },
  {
    name: 'trackDocumentUploaded',
    run: () => analytics.trackDocumentUploaded('nanny', 'passport'),
    expectedKeys: ['owner', 'document_type'],
  },
  {
    name: 'trackLocationDetected',
    run: () => analytics.trackLocationDetected('parent'),
    expectedKeys: ['owner', 'method'],
  },
  {
    name: 'trackResumeParsed',
    run: () => analytics.trackResumeParsed(0.9, 4),
    expectedKeys: ['confidence', 'applied_fields_count'],
  },
  {
    name: 'trackResumeAutofillApplied',
    run: () => analytics.trackResumeAutofillApplied(4),
    expectedKeys: ['applied_fields_count'],
  },
  {
    name: 'trackNannyFormStarted',
    run: () => analytics.trackNannyFormStarted(),
    expectedKeys: ['page', 'source'],
  },
  {
    name: 'trackNannyFormStep',
    run: () => analytics.trackNannyFormStep(2, 'verification'),
    expectedKeys: ['form_type', 'step', 'step_name'],
  },
  { name: 'trackNannyOfferShown', run: () => analytics.trackNannyOfferShown(), expectedKeys: [] },
  {
    name: 'trackNannyOfferAccepted',
    run: () => analytics.trackNannyOfferAccepted(),
    expectedKeys: [],
  },
  {
    name: 'trackNannyReadyForMatch',
    run: () => analytics.trackNannyReadyForMatch(80),
    expectedKeys: ['quality_score'],
  },
  {
    name: 'trackMatchProfileOpen',
    run: () => analytics.trackMatchProfileOpen(UUID_A, 2, 80),
    expectedKeys: ['nanny_id', 'position', 'score'],
  },
  {
    name: 'trackMatchFollowUpShown',
    run: () => analytics.trackMatchFollowUpShown('fresh'),
    expectedKeys: ['stage'],
  },
  {
    name: 'trackMatchFollowUpClicked',
    run: () => analytics.trackMatchFollowUpClicked('engaged'),
    expectedKeys: ['stage'],
  },
  {
    name: 'trackBookingCreated',
    run: () => analytics.trackBookingCreated(UUID_A, UUID_B),
    expectedKeys: ['parent_id', 'nanny_id'],
  },
  {
    name: 'trackShortlistDelivered',
    run: () => analytics.trackShortlistDelivered(UUID_A, 3),
    expectedKeys: ['parent_id', 'candidate_count'],
  },
  {
    name: 'trackMatchOutcomeRecorded',
    run: () => analytics.trackMatchOutcomeRecorded('hired', UUID_A, UUID_B, 90),
    expectedKeys: ['outcome', 'parent_id', 'nanny_id', 'score_at_match'],
  },
];

describe('track* helpers vs schema (BLI-116 drift guard)', () => {
  const capture = vi.fn();

  beforeEach(() => {
    capture.mockReset();
    // Node test env (no DOM): stub the minimal browser globals track() touches.
    vi.stubGlobal('window', { posthog: { capture }, location: { pathname: '/' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  for (const c of cases) {
    it(`${c.name} emits exactly its schema-allowed keys`, () => {
      c.run();
      expect(capture).toHaveBeenCalledTimes(1);
      const props = capture.mock.calls[0][1] as Record<string, unknown>;
      // session_id is a global; timestamp/url are envelope fields added by track.
      const emitted = Object.keys(props).filter(
        (k) => !['session_id', 'timestamp', 'url'].includes(k),
      );
      expect(emitted.sort()).toEqual([...c.expectedKeys].sort());
      // session_id always present and safe-id shaped.
      expect(typeof props.session_id).toBe('string');
    });
  }
});
