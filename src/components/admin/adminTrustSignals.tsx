import React from 'react';
import { NannyProfile, ParentRequest } from '@/core/types';

type SignalStatus = 'ok' | 'pending' | 'missing';

interface TrustBadge {
  label: string;
  status: SignalStatus;
}

export function getNannyTrustBadges(n: NannyProfile): TrustBadge[] {
  const docs = n.documents || [];
  const allVerified = docs.length > 0 && docs.every((d) => d.status === 'verified');
  const anyPending = docs.some((d) => d.status === 'pending');
  const docsStatus: SignalStatus = allVerified ? 'ok' : anyPending ? 'pending' : 'missing';
  return [
    {
      label: n.isVerified ? 'Личность подтверждена' : 'Личность не подтверждена',
      status: n.isVerified ? 'ok' : 'missing',
    },
    {
      label:
        docsStatus === 'ok'
          ? 'Документы проверены'
          : docsStatus === 'pending'
            ? 'Документы на проверке'
            : 'Документы не загружены',
      status: docsStatus,
    },
    {
      label:
        n.experience && Number(n.experience) > 0 ? 'Опыт указан' : 'Опыт нужно уточнить',
      status: n.experience && Number(n.experience) > 0 ? 'ok' : 'missing',
    },
    {
      label: n.video ? 'Видео есть' : n.videoIntro ? 'Видео ожидает просмотра' : 'Видео не загружено',
      status: n.video ? 'ok' : n.videoIntro ? 'pending' : 'missing',
    },
  ];
}

export function getNannyRiskFlags(n: NannyProfile): string[] {
  const flags: string[] = [];
  const docs = n.documents || [];
  if (docs.length === 0) flags.push('Нет документов');
  if (docs.some((d) => d.status === 'rejected')) flags.push('Есть отклонённые документы');
  if (docs.some((d) => (d.aiConfidence ?? 100) < 70)) flags.push('Низкая уверенность по скану');
  if (!n.isVerified && docs.length > 0) flags.push('Личность не подтверждена');
  return flags;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getParentRiskFlags(p: ParentRequest): string[] {
  const flags: string[] = [];
  const now = Date.now();
  const updated = Number(p.updatedAt || p.createdAt || 0);
  if (p.status === 'new' && updated > 0 && now - updated > 2 * DAY_MS) {
    flags.push('Без действий > 48 часов');
  }
  if (p.status === 'payment_pending') flags.push('Ожидает оплату');
  if (!p.requesterEmail) flags.push('Контакт не задан');
  return flags;
}

const statusStyle: Record<SignalStatus, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  missing: 'bg-stone-50 text-stone-500 border-stone-200',
};

const statusDot: Record<SignalStatus, string> = {
  ok: 'bg-emerald-500',
  pending: 'bg-amber-500',
  missing: 'bg-stone-300',
};

export const TrustBadgeRow: React.FC<{ badges: TrustBadge[] }> = ({ badges }) => (
  <div className="flex flex-wrap gap-1.5">
    {badges.map((b) => (
      <span
        key={b.label}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle[b.status]}`}
      >
        <span className={`size-1.5 rounded-full ${statusDot[b.status]}`} />
        {b.label}
      </span>
    ))}
  </div>
);

export const RiskFlagRow: React.FC<{ flags: string[] }> = ({ flags }) => {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700"
        >
          <span className="size-1.5 rounded-full bg-rose-500" />
          {f}
        </span>
      ))}
    </div>
  );
};
