import { NannyProfile, ParentRequest } from '../types';
import { AnalyticsEventRecord, ANALYTICS_EVENTS, getAnalyticsEvents } from './analytics';
import { Booking } from './booking';
import { getNannyReadinessSnapshot } from './nannyReadiness';

export interface DashboardMetrics {
  supply: {
    total: number;
    docsUploaded: number;
    resumesParsed: number;
    readyForReview: number;
    qualityApproved: number;
  };
  parentConversion: {
    starts: number;
    submitted: number;
    resultsViewed: number;
    submitRate: number;
    matchViewRate: number;
  };
  retention: {
    resultViews: number;
    profileOpens: number;
    firstActionRate: number;
    bookingsCreated: number;
    bookingRate: number;
    completedBookings: number;
    repeatFamilies: number;
    reviewsCaptured: number;
  };
  parentOps: {
    total: number;
    needsAction: number;
    approved: number;
  };
}

function countEvents(
  events: AnalyticsEventRecord[],
  event: string,
  predicate?: (record: AnalyticsEventRecord) => boolean,
): number {
  return events.filter((record) => record.event === event && (!predicate || predicate(record))).length;
}

function getSessionKey(record: AnalyticsEventRecord): string | null {
  const value = record.properties?.session_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function countUniqueSessions(
  events: AnalyticsEventRecord[],
  event: string,
  predicate?: (record: AnalyticsEventRecord) => boolean,
): number {
  const matching = events.filter((record) => record.event === event && (!predicate || predicate(record)));
  const sessionIds = new Set(
    matching
      .map(getSessionKey)
      .filter((value): value is string => Boolean(value)),
  );

  return sessionIds.size > 0 ? sessionIds.size : matching.length;
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function buildDashboardMetrics(params: {
  parents: ParentRequest[];
  nannies: NannyProfile[];
  bookings: Booking[];
  events?: AnalyticsEventRecord[];
}): DashboardMetrics {
  const events = params.events || getAnalyticsEvents();
  const readiness = params.nannies.map((nanny) => getNannyReadinessSnapshot(nanny));

  const docsUploaded = params.nannies.filter((nanny) => (nanny.documents || []).length > 0).length;
  const resumesParsed = readiness.filter((item) => item.hasResume).length;
  const readyForReview = readiness.filter((item) => item.readyForReview).length;
  const qualityApproved = readiness.filter((item) => item.qualityApproved).length;

  const parentStarts = countUniqueSessions(
    events,
    ANALYTICS_EVENTS.PAGE_VIEW,
    (record) => record.properties.page === 'parent_form' && record.properties.source === 'form_start',
  );
  const parentSubmitted = countUniqueSessions(
    events,
    ANALYTICS_EVENTS.FORM_SUBMITTED,
    (record) => record.properties.form_type === 'parent',
  );
  const resultsViewed = countUniqueSessions(events, ANALYTICS_EVENTS.MATCHING_RESULTS_VIEWED);

  const profileOpens = countUniqueSessions(events, ANALYTICS_EVENTS.MATCH_PROFILE_OPENED);
  const bookingsCreated = params.bookings.length || countEvents(events, ANALYTICS_EVENTS.BOOKING_CREATED);
  const completedBookings = params.bookings.filter((booking) => booking.status === 'completed').length;
  const reviewsCaptured = params.nannies.reduce((sum, nanny) => sum + (nanny.reviews || []).length, 0);

  const repeatFamilies = Object.values(
    params.bookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.parent_id] = (acc[booking.parent_id] || 0) + 1;
      return acc;
    }, {}),
  ).filter((count) => count > 1).length;

  const approvedParents = params.parents.filter((parent) => parent.status === 'approved').length;
  const parentsNeedingAction = params.parents.filter((parent) =>
    ['new', 'in_review', 'rejected'].includes(parent.status || 'new'),
  ).length;

  return {
    supply: {
      total: params.nannies.length,
      docsUploaded,
      resumesParsed,
      readyForReview,
      qualityApproved,
    },
    parentConversion: {
      starts: parentStarts,
      submitted: parentSubmitted,
      resultsViewed,
      submitRate: toPercent(parentSubmitted, parentStarts),
      matchViewRate: toPercent(resultsViewed, parentSubmitted),
    },
    retention: {
      resultViews: resultsViewed,
      profileOpens,
      firstActionRate: toPercent(profileOpens, resultsViewed),
      bookingsCreated,
      bookingRate: toPercent(bookingsCreated, resultsViewed),
      completedBookings,
      repeatFamilies,
      reviewsCaptured,
    },
    parentOps: {
      total: params.parents.length,
      needsAction: parentsNeedingAction,
      approved: approvedParents,
    },
  };
}
