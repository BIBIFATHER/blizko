import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card } from '../UI';
import { NannyProfile, ParentRequest } from '@/core/types';
import {
  ListChecks,
  Users,
  CheckCircle,
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react';
import { Booking } from '@/services/booking';
import { buildDashboardMetrics } from '@/services/dashboardMetrics';
import { AnalyticsEventRecord, getAnalyticsEvents } from '@/services/analytics';
import { getNannyReadinessSnapshot } from '@/services/nannyReadiness';

interface AdminOverviewTabProps {
  parents: ParentRequest[];
  nannies: NannyProfile[];
  bookings: Booking[];
  events?: AnalyticsEventRecord[];
  unseenParentsCount: number;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  parents,
  nannies,
  bookings,
  events,
  unseenParentsCount,
}) => {
  const navigate = useNavigate();
  const metrics = React.useMemo(
    () =>
      buildDashboardMetrics({
        parents,
        nannies,
        bookings,
        events: events?.length ? events : getAnalyticsEvents(),
      }),
    [bookings, events, nannies, parents],
  );

  const readiness = React.useMemo(
    () => nannies.map((n) => getNannyReadinessSnapshot(n)),
    [nannies],
  );
  const verified = nannies.filter((n) => n.isVerified).length;
  const withDocs = metrics.supply.docsUploaded;
  const pendingDocs = nannies.reduce(
    (acc, n) => acc + (n.documents || []).filter((d) => d.status === 'pending').length,
    0,
  );
  const aReady = readiness.filter((item) => item.readyForReview).length;
  const qualityApproved = readiness.filter((item) => item.qualityApproved).length;
  const topMetrics: { label: string; value: number; icon: React.ReactNode; note: string; to: string }[] =
    [
      {
        label: 'Заявки родителей',
        value: metrics.parentOps.total,
        icon: <ListChecks size={18} />,
        note: `Требуют действия: ${metrics.parentOps.needsAction}`,
        to: '/admin/parents',
      },
      {
        label: 'Анкеты нянь',
        value: metrics.supply.total,
        icon: <Users size={18} />,
        note: 'Всё активное предложение',
        to: '/admin/nannies',
      },
      {
        label: 'Готовы к проверке',
        value: aReady,
        icon: <CheckCircle size={18} />,
        note: 'Можно брать в модерацию',
        to: '/admin/nannies',
      },
      {
        label: 'Проверенные анкеты',
        value: qualityApproved,
        icon: <TrendingUp size={18} />,
        note: 'Готовы к показу семье',
        to: '/admin/nannies',
      },
      {
        label: 'Документы загружены',
        value: withDocs,
        icon: <FileCheck2 size={18} />,
        note: 'Есть база для проверки',
        to: '/admin/nannies',
      },
      {
        label: 'Верифицировано',
        value: verified,
        icon: <ShieldCheck size={18} />,
        note: `На проверке документов: ${pendingDocs}`,
        to: '/admin/nannies',
      },
    ];

  return (
    <>
      {unseenParentsCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/admin/parents')}
          className="section-shell flex w-full items-center justify-between gap-3 rounded-[1.5rem] px-4 py-3 text-left text-sm text-stone-700 transition-all hover:shadow-sm"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Требует внимания
            </div>
            <div className="mt-1">Новые или обновлённые заявки родителей: {unseenParentsCount}</div>
          </div>
          <Badge variant="danger">Открыть</Badge>
        </button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {topMetrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={() => navigate(metric.to)}
            className="rounded-[1.5rem] border border-[color:var(--cloud-border)] bg-white/80 p-4 text-left transition-all hover:bg-white hover:shadow-sm"
          >
            <div className="text-xs text-stone-500">{metric.label}</div>
            <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-stone-800">
              {metric.icon} {metric.value}
            </div>
            <div className="mt-2 text-[11px] text-stone-500">{metric.note}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
        <Card className="p-4!">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs uppercase tracking-wide text-stone-400">Воронка: родители</div>
            <Badge variant="info">Воронка</Badge>
          </div>
          <div className="space-y-2 text-sm text-stone-600">
            <div className="flex items-center justify-between">
              <span>Старт формы</span>
              <strong className="text-stone-800">{metrics.parentConversion.starts}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Отправлено</span>
              <strong className="text-stone-800">{metrics.parentConversion.submitted}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Увидели мэтчи</span>
              <strong className="text-stone-800">{metrics.parentConversion.resultsViewed}</strong>
            </div>
            <div className="pt-2 text-[11px] text-stone-500">
              Доля отправивших: {metrics.parentConversion.submitRate}% • Доля увидевших подбор:{' '}
              {metrics.parentConversion.matchViewRate}%
            </div>
          </div>
        </Card>

        <Card className="p-4!">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs uppercase tracking-wide text-stone-400">
              Воронка качества нянь
            </div>
            <Badge variant="success">Качество</Badge>
          </div>
          <div className="space-y-2 text-sm text-stone-600">
            <div className="flex items-center justify-between">
              <span>Документы</span>
              <strong className="text-stone-800">{metrics.supply.docsUploaded}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Резюме распознано</span>
              <strong className="text-stone-800">{metrics.supply.resumesParsed}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Готовы к ревью</span>
              <strong className="text-stone-800">{metrics.supply.readyForReview}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Прошли проверку</span>
              <strong className="text-emerald-700">{metrics.supply.qualityApproved}</strong>
            </div>
          </div>
        </Card>

        <Card className="p-4!">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs uppercase tracking-wide text-stone-400">
              Удержание после подбора
            </div>
            <Badge variant="neutral">Удержание</Badge>
          </div>
          <div className="space-y-2 text-sm text-stone-600">
            <div className="flex items-center justify-between">
              <span>Открыли профиль</span>
              <strong className="text-stone-800 flex items-center gap-1">
                <MessageSquareText size={14} /> {metrics.retention.profileOpens}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Создано бронирований</span>
              <strong className="text-stone-800">{metrics.retention.bookingsCreated}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Повторные семьи</span>
              <strong className="text-stone-800 flex items-center gap-1">
                <RefreshCw size={14} /> {metrics.retention.repeatFamilies}
              </strong>
            </div>
            <div className="text-[11px] text-stone-500 pt-2">
              Доля первых действий: {metrics.retention.firstActionRate}% • Доля бронирований:{' '}
              {metrics.retention.bookingRate}%
            </div>
          </div>
        </Card>
      </div>

      <div className="text-[11px] text-stone-400 mt-3">
        Источник событий: {events?.length ? 'серверная аналитика' : 'локальный буфер'}. На проверке
        документов:{' '}
        <span className="font-medium text-stone-600 inline-flex items-center gap-1">
          <ShieldAlert size={12} /> {pendingDocs}
        </span>
      </div>
    </>
  );
};
