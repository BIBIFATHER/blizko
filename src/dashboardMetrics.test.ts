import { describe, expect, it } from 'vitest';
import { buildDashboardMetrics } from '@/services/dashboardMetrics';
import type { ParentRequest, NannyProfile } from '../types';
import type { Booking } from '@/services/booking';
import type { AnalyticsEventRecord } from '@/services/analytics';

function makeParent(id: string, status: ParentRequest['status'] = 'new'): ParentRequest {
  return {
    id,
    type: 'parent',
    city: 'Moscow',
    childAge: '3',
    schedule: '5/2',
    budget: '1000',
    comment: '',
    requirements: [],
    documents: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status,
    changeLog: [],
  };
}

function makeNanny(id: string): NannyProfile {
  return {
    id,
    type: 'nanny',
    name: 'Test Nanny',
    city: 'Moscow',
    experience: '5',
    schedule: '5/2',
    expectedRate: '1000',
    childAges: ['3+'],
    skills: ['care'],
    about: 'Warm and reliable',
    contact: '+79990000000',
    isVerified: true,
    documents: [
      {
        type: 'resume',
        status: 'verified',
        aiConfidence: 95,
        aiNotes: 'ok',
        verifiedAt: Date.now(),
        fileDataUrl: 'data:text/plain;base64,Zm9v',
      },
      {
        type: 'passport',
        status: 'verified',
        aiConfidence: 95,
        aiNotes: 'ok',
        verifiedAt: Date.now(),
        fileDataUrl: 'data:text/plain;base64,YmFy',
      },
    ],
    createdAt: Date.now(),
  };
}

describe('buildDashboardMetrics', () => {
  it('uses unique session ids for funnel counts when analytics include session_id', () => {
    const now = new Date().toISOString();
    const events: AnalyticsEventRecord[] = [
      { event: 'page_view', properties: { page: 'parent_form', source: 'form_start', session_id: 's1' }, timestamp: now },
      { event: 'page_view', properties: { page: 'parent_form', source: 'form_start', session_id: 's1' }, timestamp: now },
      { event: 'form_submitted', properties: { form_type: 'parent', session_id: 's1' }, timestamp: now },
      { event: 'matching_results_viewed', properties: { session_id: 's1' }, timestamp: now },
      { event: 'match_profile_opened', properties: { session_id: 's1' }, timestamp: now },
      { event: 'page_view', properties: { page: 'parent_form', source: 'form_start', session_id: 's2' }, timestamp: now },
    ];

    const metrics = buildDashboardMetrics({
      parents: [makeParent('p1', 'approved')],
      nannies: [makeNanny('n1')],
      bookings: [] as Booking[],
      events,
    });

    expect(metrics.parentConversion.starts).toBe(2);
    expect(metrics.parentConversion.submitted).toBe(1);
    expect(metrics.parentConversion.resultsViewed).toBe(1);
    expect(metrics.retention.profileOpens).toBe(1);
    expect(metrics.parentConversion.submitRate).toBe(50);
    expect(metrics.retention.firstActionRate).toBe(100);
  });
});
