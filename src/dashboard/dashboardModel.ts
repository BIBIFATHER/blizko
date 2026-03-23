import type { Booking } from '@/services/booking';
import { getNannyReadinessLabel, getNannyReadinessSnapshot } from '@/services/nannyReadiness';
import type { Language, NannyProfile, ParentRequest } from '@/core/types';

export type DashboardBadgeVariant = 'trust' | 'warning' | 'info' | 'neutral' | 'success' | 'danger';
export type DashboardKpiTone = 'stone' | 'amber' | 'sky' | 'emerald' | 'indigo';
export type DashboardIconName = 'clipboard' | 'shield' | 'calendar' | 'check' | 'sparkles' | 'star' | 'file' | 'clock';

export interface DashboardKpi {
  icon: DashboardIconName;
  label: string;
  value: string;
  helper: string;
  tone: DashboardKpiTone;
}

export interface DashboardTrendPoint {
  label: string;
  value: number;
}

export interface DashboardCallout {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
}

export interface DashboardTableRow {
  id: string;
  primary: string;
  secondary?: string;
  status: {
    label: string;
    variant: DashboardBadgeVariant;
  };
  values: string[];
}

export interface DashboardTable {
  title: string;
  columns: string[];
  rows: DashboardTableRow[];
  emptyTitle: string;
  emptyDescription: string;
}

export interface DashboardViewModel {
  eyebrow: string;
  title: string;
  description: string;
  assumption: string;
  kpis: DashboardKpi[];
  trend: {
    title: string;
    description: string;
    summary: string;
    points: DashboardTrendPoint[];
  };
  callout: DashboardCallout;
  table: DashboardTable;
}

const BUCKET_COUNT = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function copy(lang: Language, ru: string, en: string) {
  return lang === 'ru' ? ru : en;
}

function toTimestamp(value?: number | string | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatDate(value: number | string | undefined, lang: Language): string {
  const timestamp = toTimestamp(value);
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
  }).format(timestamp);
}

function formatDateTime(value: number | string | undefined, lang: Language): string {
  const timestamp = toTimestamp(value);
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function getStatusVariant(status: ParentRequest['status']): DashboardBadgeVariant {
  if (status === 'approved') return 'trust';
  if (status === 'rejected') return 'danger';
  if (status === 'in_review') return 'info';
  if (status === 'payment_pending') return 'neutral';
  return 'warning';
}

function getParentStatusLabel(status: ParentRequest['status'], lang: Language): string {
  if (status === 'approved') return copy(lang, 'Одобрена', 'Approved');
  if (status === 'rejected') return copy(lang, 'Доработать', 'Needs rework');
  if (status === 'in_review') return copy(lang, 'На проверке', 'In review');
  if (status === 'payment_pending') return copy(lang, 'Ждёт оплаты', 'Payment pending');
  return copy(lang, 'Черновик', 'Draft');
}

function getBookingStatusVariant(status: Booking['status']): DashboardBadgeVariant {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'active') return 'trust';
  if (status === 'confirmed') return 'info';
  return 'warning';
}

function getBookingStatusLabel(status: Booking['status'], lang: Language): string {
  if (status === 'completed') return copy(lang, 'Завершено', 'Completed');
  if (status === 'cancelled') return copy(lang, 'Отменено', 'Cancelled');
  if (status === 'active') return copy(lang, 'Активно', 'Active');
  if (status === 'confirmed') return copy(lang, 'Подтверждено', 'Confirmed');
  return copy(lang, 'Ожидает', 'Pending');
}

function getReadinessVariant(input: { done: boolean; warning?: boolean }): DashboardBadgeVariant {
  if (input.done) return 'success';
  if (input.warning) return 'warning';
  return 'neutral';
}

function buildTrendSummary(points: DashboardTrendPoint[], lang: Language): string {
  const recent = points.slice(-3).reduce((sum, point) => sum + point.value, 0);
  const previous = points.slice(0, -3).reduce((sum, point) => sum + point.value, 0);

  if (recent === 0 && previous === 0) {
    return copy(lang, 'Пока нет недавней активности в доступных источниках.', 'No recent activity in the available sources yet.');
  }

  if (recent > previous) {
    return copy(lang, 'Последние недели активнее предыдущего окна.', 'The latest weeks are more active than the previous window.');
  }

  if (recent < previous) {
    return copy(lang, 'Активность в последних неделях снизилась.', 'Recent activity is below the previous window.');
  }

  return copy(lang, 'Активность держится примерно на одном уровне.', 'Activity is roughly flat across the current window.');
}

function buildWeeklyTrend(timestamps: Array<number | null>, lang: Language): DashboardTrendPoint[] {
  const end = Date.now();
  const start = end - BUCKET_COUNT * WEEK_MS;
  const points: DashboardTrendPoint[] = [];

  for (let index = 0; index < BUCKET_COUNT; index += 1) {
    const bucketStart = start + index * WEEK_MS;
    const bucketEnd = bucketStart + WEEK_MS;
    const count = timestamps.filter((timestamp) => timestamp && timestamp >= bucketStart && timestamp < bucketEnd).length;

    points.push({
      label: formatDate(bucketStart, lang),
      value: count,
    });
  }

  return points;
}

export function buildFamilyDashboardModel(params: {
  lang: Language;
  requests: ParentRequest[];
  bookings: Booking[];
}): DashboardViewModel {
  const { lang, requests, bookings } = params;
  const sortedRequests = [...requests].sort((left, right) => Number(right.updatedAt || right.createdAt) - Number(left.updatedAt || left.createdAt));
  const latestRequest = sortedRequests[0];
  const openRequests = requests.filter((request) => request.status !== 'rejected').length;
  const approvedRequests = requests.filter((request) => request.status === 'approved').length;
  const liveBookings = bookings.filter((booking) => ['pending', 'confirmed', 'active'].includes(booking.status)).length;
  const completedBookings = bookings.filter((booking) => booking.status === 'completed').length;
  const rejectedRequests = requests.filter((request) => request.status === 'rejected').length;

  const trendPoints = buildWeeklyTrend(
    [
      ...requests.map((request) => toTimestamp(request.createdAt)),
      ...bookings.map((booking) => toTimestamp(booking.created_at)),
    ],
    lang,
  );

  return {
    eyebrow: copy(lang, 'Семейный кабинет', 'Family dashboard'),
    title: copy(lang, 'Главные сигналы по заявкам и бронированиям', 'Core signals for requests and bookings'),
    description: copy(
      lang,
      'Минимальный рабочий дашборд для семьи: что отправлено, что одобрено и что уже перешло в живые бронирования.',
      'A minimal working dashboard for families: what was submitted, what got approved, and what already became live bookings.',
    ),
    assumption: copy(
      lang,
      'Допущение: метрики не были заданы, поэтому дашборд использует самый короткий набор уже доступных в репозитории сущностей: заявки семьи и бронирования.',
      'Assumption: metrics were not specified, so the dashboard uses the smallest set of entities already available in the repo: family requests and bookings.',
    ),
    kpis: [
      {
        icon: 'clipboard',
        label: copy(lang, 'Открытые заявки', 'Open requests'),
        value: String(openRequests),
        helper: rejectedRequests > 0
          ? copy(lang, `Требуют доработки: ${rejectedRequests}`, `Need rework: ${rejectedRequests}`)
          : copy(lang, 'Без блокирующих возвратов', 'No blocking rework items'),
        tone: 'stone',
      },
      {
        icon: 'shield',
        label: copy(lang, 'Одобрено', 'Approved'),
        value: String(approvedRequests),
        helper: latestRequest
          ? copy(lang, `Последнее обновление: ${formatDateTime(latestRequest.updatedAt || latestRequest.createdAt, lang)}`, `Last update: ${formatDateTime(latestRequest.updatedAt || latestRequest.createdAt, lang)}`)
          : copy(lang, 'Пока нет отправленных заявок', 'No submitted requests yet'),
        tone: 'emerald',
      },
      {
        icon: 'calendar',
        label: copy(lang, 'Живые бронирования', 'Live bookings'),
        value: String(liveBookings),
        helper: copy(lang, 'Считаем pending, confirmed и active', 'Counts pending, confirmed, and active'),
        tone: 'sky',
      },
      {
        icon: 'check',
        label: copy(lang, 'Завершено', 'Completed'),
        value: String(completedBookings),
        helper: copy(lang, 'История подтвержденных сессий', 'History of completed sessions'),
        tone: 'amber',
      },
    ],
    trend: {
      title: copy(lang, 'Пульс активности за 6 недель', '6-week activity pulse'),
      description: copy(lang, 'Смотрим заявки и созданные бронирования.', 'Based on request creation and booking creation.'),
      summary: buildTrendSummary(trendPoints, lang),
      points: trendPoints,
    },
    callout: {
      title: latestRequest
        ? copy(lang, 'Последняя заявка', 'Latest request')
        : copy(lang, 'Следующий шаг', 'Next step'),
      description: latestRequest
        ? (latestRequest.status === 'rejected'
          ? latestRequest.rejectionInfo?.reasonText || copy(lang, 'Модерация ждёт доработку анкеты.', 'Moderation is waiting for updates to the request.')
          : copy(lang, 'Отсюда удобно читать текущий статус без перехода в профиль.', 'Use this card to track the current status without opening the profile modal.'))
        : copy(lang, 'Создайте первую заявку, и здесь появится её прогресс.', 'Create your first request and its progress will appear here.'),
      items: latestRequest ? [
        {
          label: copy(lang, 'Статус', 'Status'),
          value: getParentStatusLabel(latestRequest.status, lang),
        },
        {
          label: copy(lang, 'Документы', 'Documents'),
          value: String(latestRequest.documents?.length || 0),
        },
        {
          label: copy(lang, 'Обновлено', 'Updated'),
          value: formatDateTime(latestRequest.updatedAt || latestRequest.createdAt, lang),
        },
      ] : [
        {
          label: copy(lang, 'Заявки', 'Requests'),
          value: '0',
        },
        {
          label: copy(lang, 'Бронирования', 'Bookings'),
          value: String(bookings.length),
        },
        {
          label: copy(lang, 'Совет', 'Hint'),
          value: copy(lang, 'Начните с анкеты семьи', 'Start with a family request'),
        },
      ],
    },
    table: {
      title: copy(lang, 'Разбивка по заявкам', 'Request breakdown'),
      columns: [
        copy(lang, 'Заявка', 'Request'),
        copy(lang, 'Статус', 'Status'),
        copy(lang, 'Детали', 'Details'),
        copy(lang, 'Обновлено', 'Updated'),
      ],
      rows: sortedRequests.map((request) => ({
        id: request.id,
        primary: `${request.city || '—'} • ${request.childAge || '—'}`,
        secondary: request.comment || copy(lang, 'Без комментария', 'No comment'),
        status: {
          label: getParentStatusLabel(request.status, lang),
          variant: getStatusVariant(request.status),
        },
        values: [
          `${request.schedule || '—'} • ${copy(lang, 'документов', 'docs')}: ${request.documents?.length || 0}`,
          formatDateTime(request.updatedAt || request.createdAt, lang),
        ],
      })),
      emptyTitle: copy(lang, 'Заявок пока нет', 'No requests yet'),
      emptyDescription: copy(lang, 'После первой отправки здесь появится управляемый список заявок.', 'After the first submission, requests will appear here in a structured list.'),
    },
  };
}

export function buildNannyDashboardModel(params: {
  lang: Language;
  profile?: NannyProfile;
  bookings: Booking[];
}): DashboardViewModel {
  const { lang, profile, bookings } = params;
  const snapshot = getNannyReadinessSnapshot(profile || {});
  const liveBookings = bookings.filter((booking) => ['pending', 'confirmed', 'active'].includes(booking.status)).length;
  const completedBookings = bookings.filter((booking) => booking.status === 'completed').length;
  const reviewCount = profile?.reviews?.length || 0;

  const basicsComplete = Boolean(
    profile?.name &&
    profile.city &&
    profile.experience &&
    profile.schedule &&
    profile.expectedRate &&
    profile.about &&
    profile.contact &&
    (profile.childAges || []).length > 0,
  );

  const trendPoints = buildWeeklyTrend(
    [
      toTimestamp(profile?.createdAt),
      ...bookings.map((booking) => toTimestamp(booking.created_at)),
      ...(profile?.reviews || []).map((review) => toTimestamp(review.date)),
    ],
    lang,
  );

  const readinessRows: DashboardTableRow[] = [
    {
      id: 'profile',
      primary: copy(lang, 'База профиля', 'Profile basics'),
      secondary: copy(lang, 'Имя, город, опыт, график, ставка, контакты', 'Name, city, experience, schedule, rate, contact'),
      status: {
        label: basicsComplete ? copy(lang, 'Заполнено', 'Complete') : copy(lang, 'Нужно заполнить', 'Needs input'),
        variant: getReadinessVariant({ done: basicsComplete, warning: Boolean(profile) }),
      },
      values: [
        profile ? formatDate(profile.createdAt, lang) : '—',
        `${copy(lang, 'Прогресс', 'Progress')}: ${snapshot.completionRatio}%`,
      ],
    },
    {
      id: 'resume',
      primary: copy(lang, 'Резюме', 'Resume'),
      secondary: copy(lang, 'Файл резюме или распознанный профиль', 'Resume file or parsed profile'),
      status: {
        label: snapshot.hasResume ? copy(lang, 'Есть', 'Uploaded') : copy(lang, 'Нет', 'Missing'),
        variant: getReadinessVariant({ done: snapshot.hasResume, warning: Boolean(profile) }),
      },
      values: [
        copy(lang, 'Источник', 'Source'),
        snapshot.hasResume ? copy(lang, 'Резюме доступно', 'Resume available') : copy(lang, 'Добавьте файл резюме', 'Add a resume file'),
      ],
    },
    {
      id: 'docs',
      primary: copy(lang, 'Документы доверия', 'Trust documents'),
      secondary: copy(lang, 'Паспорт, рекомендации, медкнижка и др.', 'Passport, references, medical book, etc.'),
      status: {
        label: snapshot.hasTrustDocs ? copy(lang, 'Загружены', 'Uploaded') : copy(lang, 'Не загружены', 'Missing'),
        variant: getReadinessVariant({ done: snapshot.hasTrustDocs, warning: Boolean(profile) }),
      },
      values: [
        copy(lang, 'Файлов', 'Files'),
        String((profile?.documents || []).filter((document) => document.type !== 'resume').length),
      ],
    },
    {
      id: 'verification',
      primary: copy(lang, 'Верификация', 'Verification'),
      secondary: copy(lang, 'Подтвержденный trust-сигнал для семьи', 'Confirmed trust signal visible to families'),
      status: {
        label: snapshot.hasVerifiedTrust ? copy(lang, 'Подтверждено', 'Verified') : copy(lang, 'В очереди', 'Pending'),
        variant: getReadinessVariant({ done: snapshot.hasVerifiedTrust, warning: Boolean(profile) }),
      },
      values: [
        copy(lang, 'Статус', 'State'),
        snapshot.hasVerifiedTrust ? copy(lang, 'Можно усиливать выдачу', 'Eligible for stronger exposure') : copy(lang, 'Ждёт ручной проверки', 'Waiting for manual review'),
      ],
    },
    {
      id: 'match-ready',
      primary: copy(lang, 'Готовность к показу', 'Match readiness'),
      secondary: copy(lang, 'Сводный статус readiness + quality score', 'Combined readiness and quality score status'),
      status: {
        label: snapshot.qualityApproved
          ? copy(lang, 'Готова к показу', 'Ready for match')
          : snapshot.readyForReview
            ? copy(lang, 'Готова к ревью', 'Ready for review')
            : copy(lang, 'Еще не готова', 'Not ready yet'),
        variant: snapshot.qualityApproved ? 'trust' : snapshot.readyForReview ? 'info' : 'warning',
      },
      values: [
        getNannyReadinessLabel(snapshot, lang),
        `${copy(lang, 'Score', 'Score')}: ${snapshot.qualityScore}`,
      ],
    },
  ];

  return {
    eyebrow: copy(lang, 'Кабинет няни', 'Nanny dashboard'),
    title: copy(lang, 'Главные сигналы по readiness и заказам', 'Core signals for readiness and bookings'),
    description: copy(
      lang,
      'Минимальный рабочий дашборд для няни: готовность профиля, доверие и текущая динамика заказов.',
      'A minimal working dashboard for nannies: profile readiness, trust, and current booking dynamics.',
    ),
    assumption: copy(
      lang,
      'Допущение: метрики не были заданы, поэтому дашборд использует самый короткий набор уже доступных в репозитории сущностей: профиль няни, readiness и бронирования.',
      'Assumption: metrics were not specified, so the dashboard uses the smallest set of entities already available in the repo: nanny profile, readiness, and bookings.',
    ),
    kpis: [
      {
        icon: 'sparkles',
        label: copy(lang, 'Прогресс профиля', 'Profile completion'),
        value: `${snapshot.completionRatio}%`,
        helper: snapshot.missingFields.length
          ? copy(lang, `Не хватает: ${snapshot.missingFields.slice(0, 2).join(', ')}`, `Missing: ${snapshot.missingFields.slice(0, 2).join(', ')}`)
          : copy(lang, 'Ключевые поля закрыты', 'Core fields are complete'),
        tone: 'stone',
      },
      {
        icon: 'shield',
        label: copy(lang, 'Quality score', 'Quality score'),
        value: String(snapshot.qualityScore),
        helper: getNannyReadinessLabel(snapshot, lang),
        tone: snapshot.qualityApproved ? 'emerald' : 'indigo',
      },
      {
        icon: 'calendar',
        label: copy(lang, 'Живые заказы', 'Live bookings'),
        value: String(liveBookings),
        helper: copy(lang, 'Считаем pending, confirmed и active', 'Counts pending, confirmed, and active'),
        tone: 'sky',
      },
      {
        icon: 'star',
        label: copy(lang, 'Отзывы', 'Reviews'),
        value: String(reviewCount),
        helper: copy(lang, `Завершено заказов: ${completedBookings}`, `Completed bookings: ${completedBookings}`),
        tone: 'amber',
      },
    ],
    trend: {
      title: copy(lang, 'Пульс активности за 6 недель', '6-week activity pulse'),
      description: copy(lang, 'Смотрим профиль, бронирования и отзывы.', 'Based on profile creation, bookings, and reviews.'),
      summary: buildTrendSummary(trendPoints, lang),
      points: trendPoints,
    },
    callout: {
      title: snapshot.qualityApproved
        ? copy(lang, 'Профиль готов к выдаче', 'Profile is ready for exposure')
        : copy(lang, 'Следующий шаг readiness', 'Next readiness step'),
      description: snapshot.qualityApproved
        ? copy(lang, 'Поддерживайте календарь и ответы актуальными, чтобы не терять quality-approved статус.', 'Keep availability and responses current so you do not lose the quality-approved state.')
        : (snapshot.missingFields.length
          ? copy(lang, `Сфокусируйтесь на: ${snapshot.missingFields.slice(0, 3).join(', ')}.`, `Focus on: ${snapshot.missingFields.slice(0, 3).join(', ')}.`)
          : copy(lang, 'Профиль близок к следующему шагу проверки.', 'The profile is close to the next review stage.')),
      items: [
        {
          label: copy(lang, 'Стадия', 'Stage'),
          value: getNannyReadinessLabel(snapshot, lang),
        },
        {
          label: copy(lang, 'Верификация', 'Verification'),
          value: snapshot.hasVerifiedTrust ? copy(lang, 'Есть', 'Verified') : copy(lang, 'Нет', 'Pending'),
        },
        {
          label: copy(lang, 'Последнее обновление', 'Last update'),
          value: profile ? formatDateTime(profile.createdAt, lang) : '—',
        },
      ],
    },
    table: {
      title: copy(lang, 'Разбивка по readiness', 'Readiness breakdown'),
      columns: [
        copy(lang, 'Чекпоинт', 'Checkpoint'),
        copy(lang, 'Статус', 'Status'),
        copy(lang, 'Сигнал 1', 'Signal 1'),
        copy(lang, 'Сигнал 2', 'Signal 2'),
      ],
      rows: readinessRows,
      emptyTitle: copy(lang, 'Профиль не найден', 'Profile not found'),
      emptyDescription: copy(lang, 'После создания анкеты здесь появятся readiness-сигналы.', 'Once the profile exists, readiness signals will appear here.'),
    },
  };
}
