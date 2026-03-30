import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import type { Booking } from '@/services/booking';
import { getBookingsForUser } from '@/services/booking';
import { trackPageView } from '@/services/analytics';
import { getMyNannyProfile, getMyParentRequests } from '@/services/storage';
import type { Language, NannyProfile, ParentRequest, User } from '@/core/types';
import {
  type DashboardKpi,
  type DashboardTrendPoint,
  buildFamilyDashboardModel,
  buildNannyDashboardModel,
} from '@/services/dashboardModel';
import { Badge, Button, Card, ErrorState } from '../UI';

interface RoleDashboardProps {
  user: User;
  lang: Language;
}

const getNowTs = () => Date.now();

const toneClasses: Record<DashboardKpi['tone'], string> = {
  stone: 'bg-white border-stone-100',
  amber: 'bg-amber-50/70 border-amber-100',
  sky: 'bg-sky-50/70 border-sky-100',
  emerald: 'bg-emerald-50/70 border-emerald-100',
  indigo: 'bg-indigo-50/70 border-indigo-100',
};

const iconWrapClasses: Record<DashboardKpi['tone'], string> = {
  stone: 'bg-stone-100 text-stone-700',
  amber: 'bg-amber-100 text-amber-700',
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

function getKpiIcon(icon: DashboardKpi['icon']) {
  if (icon === 'clipboard') return ClipboardList;
  if (icon === 'shield') return ShieldCheck;
  if (icon === 'calendar') return CalendarClock;
  if (icon === 'check') return CheckCircle2;
  if (icon === 'sparkles') return Sparkles;
  if (icon === 'star') return Star;
  return RefreshCw;
}

function TrendBars({ points }: { points: DashboardTrendPoint[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-48">
      {points.map((point) => {
        const height = point.value === 0 ? 10 : Math.max((point.value / max) * 100, 18);

        return (
          <div key={point.label} className="flex h-full flex-col justify-end gap-2">
            <div className="text-center text-[11px] font-semibold text-stone-500">{point.value}</div>
            <div
              className="rounded-t-[18px] bg-linear-to-t from-stone-900 via-stone-700 to-amber-300 shadow-[0_10px_20px_rgba(120,113,108,0.12)]"
              style={{ height: `${height}%` }}
            />
            <div className="text-center text-[10px] uppercase tracking-[0.08em] text-stone-400">
              {point.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RoleDashboard({ user, lang }: RoleDashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [requests, setRequests] = useState<ParentRequest[]>([]);
  const [profile, setProfile] = useState<NannyProfile | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const isNanny = user.role === 'nanny';

  const loadData = useCallback(async () => {
    if (!user.role) return;

    setLoading(true);
    setError(null);

    try {
      const nextBookings = user.id ? await getBookingsForUser(user.id) : [];

      if (isNanny) {
        const nextProfile = await getMyNannyProfile(user);
        setProfile(nextProfile);
        setRequests([]);
      } else {
        const nextRequests = await getMyParentRequests(user);
        setRequests(nextRequests);
        setProfile(undefined);
      }

      setBookings(nextBookings);
      setLastLoadedAt(getNowTs());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [isNanny, user]);

  useEffect(() => {
    if (!user.role) return;

    trackPageView(isNanny ? 'nanny_dashboard' : 'family_dashboard');
    void loadData();
  }, [isNanny, loadData, user.role]);

  if (!user.role) return null;

  const model = isNanny
    ? buildNannyDashboardModel({ lang, profile, bookings })
    : buildFamilyDashboardModel({ lang, requests, bookings });

  const primaryActionLabel = isNanny
    ? (lang === 'ru' ? 'Открыть анкету няни' : 'Open nanny profile')
    : (lang === 'ru' ? 'Открыть анкету семьи' : 'Open family request');

  return (
    <div className="page-frame section-stack animate-fade-in">
      <section className="hero-shell">
        <div className="hero-grid">
          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="eyebrow">{model.eyebrow}</div>
              <div className="topbar-chip">
                <ShieldCheck size={12} />
                {lang === 'ru' ? 'Живые данные' : 'Live data'}
              </div>
            </div>

            <div className="hero-copy space-y-0">
              <h1 className="hero-title hero-title-wide">{model.title}</h1>
              <p className="hero-body max-w-2xl">{model.description}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                onClick={() => void loadData()}
                isLoading={loading}
                className="w-full sm:w-auto px-5"
              >
                <RefreshCw size={16} />
                {lang === 'ru' ? 'Обновить' : 'Refresh'}
              </Button>
              <Button
                onClick={() => navigate(isNanny ? '/become-nanny' : '/find-nanny')}
                className="w-full sm:w-auto px-5"
              >
                {primaryActionLabel}
              </Button>
            </div>
          </div>

          <div className="relative z-10 grid gap-3">
            <div className="hero-stat">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {lang === 'ru' ? 'Последняя синхронизация' : 'Last synced'}
              </p>
              <p className="mt-3 text-2xl font-semibold text-stone-950">
                {lastLoadedAt ? new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(lastLoadedAt) : '—'}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {lang === 'ru' ? 'Дашборд собирается из реальных заявок, бронирований и статусов профиля.' : 'The dashboard is assembled from real requests, bookings, and profile states.'}
              </p>
            </div>

            <Card className="p-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {lang === 'ru' ? 'Допущение' : 'Assumption'}
                </div>
                <p className="text-sm leading-6 text-stone-600">{model.assumption}</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {error ? (
        <Card className="p-6! bg-white border-stone-100">
          <ErrorState
            title={lang === 'ru' ? 'Не удалось загрузить дашборд' : 'Could not load the dashboard'}
            description={error}
            onRetry={() => void loadData()}
          />
        </Card>
      ) : (
        <>
          <section className="section-shell p-4 md:p-6">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {lang === 'ru' ? 'Сводка' : 'Summary'}
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {lang === 'ru' ? 'Быстрый срез по активности, качеству и следующему полезному действию.' : 'A fast snapshot of activity, quality, and the next useful move.'}
                </p>
              </div>
            </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {model.kpis.map((kpi) => {
              const Icon = getKpiIcon(kpi.icon);

              return (
                <Card key={kpi.label} className={`p-5! ${toneClasses[kpi.tone]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconWrapClasses[kpi.tone]}`}>
                      <Icon size={18} />
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-widest text-stone-400">{kpi.label}</div>
                      <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-900">{kpi.value}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm leading-6 text-stone-600">{kpi.helper}</div>
                </Card>
              );
            })}
          </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card className="p-5! bg-white border-stone-100">
              <div className="mb-5 space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">{model.trend.title}</div>
                <div className="text-sm text-stone-600">{model.trend.description}</div>
              </div>

              {loading ? (
                <div className="secondary-card border-dashed bg-stone-50/70 px-4 py-10 text-center text-sm text-stone-500">
                  {lang === 'ru' ? 'Загружаем реальные точки активности…' : 'Loading real activity points…'}
                </div>
              ) : (
                <TrendBars points={model.trend.points} />
              )}

              <div className="secondary-card mt-5 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                {model.trend.summary}
              </div>
            </Card>

            <Card className="p-5! bg-white border-stone-100">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  {lang === 'ru' ? 'Контекст' : 'Context'}
                </div>
                <div className="text-xl font-semibold tracking-[-0.03em] text-stone-900">{model.callout.title}</div>
                <p className="text-sm leading-6 text-stone-600">{model.callout.description}</p>
              </div>

              <div className="mt-5 space-y-3">
                {model.callout.items.map((item) => (
                  <div key={item.label} className="surface-panel secondary-card border-white/70 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-stone-400">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-stone-700">{item.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-0! overflow-hidden bg-white border-stone-100">
            <div className="border-b border-stone-100 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">{model.table.title}</div>
            </div>

            {model.table.rows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-base font-semibold text-stone-800">{model.table.emptyTitle}</div>
                <div className="mt-2 text-sm text-stone-500">{model.table.emptyDescription}</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-stone-50/80">
                    <tr>
                      {model.table.columns.map((column) => (
                        <th key={column} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {model.table.rows.map((row) => (
                      <tr key={row.id} className="border-t border-stone-100 align-top">
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-stone-800">{row.primary}</div>
                          {row.secondary && <div className="mt-1 text-sm text-stone-500">{row.secondary}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={row.status.variant}>{row.status.label}</Badge>
                        </td>
                        {row.values.map((value) => (
                          <td key={`${row.id}-${value}`} className="px-5 py-4 text-sm text-stone-600">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="form-footer-rail p-5 md:p-6">
            <p className="text-sm leading-7 text-stone-500">
              {lang === 'ru'
                ? 'Дашборд нужен не ради отчёта, а ради следующего понятного действия: обновить профиль, ответить семье или проверить бронь.'
                : 'The dashboard exists to clarify the next useful action: update a profile, reply to a family, or verify a booking.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default RoleDashboard;
