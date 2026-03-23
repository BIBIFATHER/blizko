import { describe, expect, it } from 'vitest';
import type { Booking } from '@/services/booking';
import { getNannyReadinessSnapshot } from '@/services/nannyReadiness';
import type { NannyProfile, ParentRequest } from '@/core/types';
import { buildFamilyDashboardModel, buildNannyDashboardModel } from './dashboardModel';

function makeParentRequest(id: string, status: ParentRequest['status']): ParentRequest {
  const createdAt = Date.now() - 2 * 24 * 60 * 60 * 1000;

  return {
    id,
    type: 'parent',
    city: 'Moscow',
    childAge: '3 years',
    schedule: '5/2',
    budget: '120000',
    comment: 'Need someone calm and reliable',
    requirements: ['first aid'],
    documents: [],
    createdAt,
    updatedAt: createdAt + 60 * 60 * 1000,
    status,
    changeLog: [],
  };
}

function makeBooking(id: string, status: Booking['status']): Booking {
  return {
    id,
    parent_id: 'parent-1',
    nanny_id: 'nanny-1',
    request_id: 'request-1',
    date: '2026-03-19T10:00:00.000Z',
    status,
    amount: '5000',
    created_at: '2026-03-18T10:00:00.000Z',
  };
}

function makeNannyProfile(): NannyProfile {
  return {
    id: 'nanny-1',
    type: 'nanny',
    name: 'Anna',
    city: 'Moscow',
    experience: '6',
    schedule: '5/2',
    expectedRate: '1500',
    childAges: ['3+'],
    skills: ['first aid', 'bedtime'],
    about: 'Reliable and warm',
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
    reviews: [
      {
        id: 'review-1',
        authorName: 'Parent',
        rating: 5,
        text: 'Great',
        date: Date.now(),
      },
    ],
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  };
}

describe('dashboardModel', () => {
  it('builds a family dashboard from requests and bookings', () => {
    const model = buildFamilyDashboardModel({
      lang: 'en',
      requests: [
        makeParentRequest('request-1', 'approved'),
        makeParentRequest('request-2', 'rejected'),
      ],
      bookings: [
        makeBooking('booking-1', 'pending'),
        makeBooking('booking-2', 'completed'),
      ],
    });

    expect(model.eyebrow).toBe('Family dashboard');
    expect(model.kpis.map((kpi) => kpi.value)).toEqual(['1', '1', '1', '1']);
    expect(model.table.rows).toHaveLength(2);
    expect(model.table.rows.some((row) => row.status.label === 'Approved')).toBe(true);
    expect(model.trend.points).toHaveLength(6);
  });

  it('builds a nanny dashboard from readiness and bookings', () => {
    const profile = makeNannyProfile();
    const snapshot = getNannyReadinessSnapshot(profile);
    const model = buildNannyDashboardModel({
      lang: 'ru',
      profile,
      bookings: [
        makeBooking('booking-1', 'active'),
        makeBooking('booking-2', 'completed'),
      ],
    });

    expect(model.eyebrow).toBe('Кабинет няни');
    expect(model.kpis[0].value).toBe(`${snapshot.completionRatio}%`);
    expect(model.kpis[1].value).toBe(String(snapshot.qualityScore));
    expect(model.kpis[2].value).toBe('1');
    expect(model.kpis[3].value).toBe('1');
    expect(model.table.rows[4].status.label).toBe(
      snapshot.qualityApproved ? 'Готова к показу' : snapshot.readyForReview ? 'Готова к ревью' : 'Еще не готова',
    );
  });
});
