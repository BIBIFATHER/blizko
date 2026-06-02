import React, { useMemo, useState } from 'react';
import { ProgressBar } from '../UI';
import { NannyProfile, Review } from '@/core/types';
import { getAssessmentSignalLabel } from '@/services/assessment';
import { getNannyReadinessLabel, getNannyReadinessSnapshot } from '@/services/nannyReadiness';
import {
  X,
  ShieldCheck,
  BrainCircuit,
  PlayCircle,
  User as UserIcon,
  FileCheck2,
  ChevronRight,
} from 'lucide-react';
import { exportNanniesCsv, exportNanniesOpsCsv, copyNanniesOpsForTable } from './adminExportUtils';
import {
  AdminDocumentPreviewModal,
  AdminPillButton,
  adminModalSurface,
  adminModalHeader,
  adminSectionPanel,
  adminSubsectionPanel,
} from './adminPrimitives';
import { AdminPreviewDoc } from './adminModerationUtils';
import {
  TrustBadgeRow,
  RiskFlagRow,
  getNannyTrustBadges,
  getNannyRiskFlags,
} from './adminTrustSignals';
import { useAdminNannyModeration } from '@/hooks/useAdminNannyModeration';
import { useAdminWorkflowUI } from './adminWorkflowUI';
import { getNannyDocSignedUrl } from '@/services/adminApi';

type NannyIssueFilter = 'all' | 'noDocs' | 'rejected' | 'pending' | 'unverified';

const docTypeLabel = (type: string) =>
  type === 'passport'
    ? 'Паспорт'
    : type === 'medical_book'
      ? 'Медкнижка'
      : type === 'recommendation_letter'
        ? 'Рекомендация'
        : type === 'education_document'
          ? 'Образование'
          : type === 'resume'
            ? 'Резюме'
            : 'Документ';

interface AdminNanniesTabProps {
  nannies: NannyProfile[];
  query: string;
  onlyProblematic: boolean;
  onDataChanged: () => void;
  logAdminAction: (action: string, meta?: Record<string, unknown>) => void;
}

export const AdminNanniesTab: React.FC<AdminNanniesTabProps> = ({
  nannies,
  query,
  onlyProblematic,
  onDataChanged,
  logAdminAction,
}) => {
  const { reportError, reportInfo, reportSuccess } = useAdminWorkflowUI();
  const [issueFilter, setIssueFilter] = useState<NannyIssueFilter>('all');
  const [previewDoc, setPreviewDoc] = useState<AdminPreviewDoc | null>(null);
  const [calendarNanny, setCalendarNanny] = useState<NannyProfile | null>(null);
  const [selectedNanny, setSelectedNanny] = useState<NannyProfile | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; name: string } | null>(null);

  const openPhotoZoom = (event: React.MouseEvent, n: NannyProfile) => {
    if (!n.photo) return;
    event.stopPropagation();
    setZoomedPhoto({ url: n.photo, name: n.name });
  };

  const getNannyFlags = (n: NannyProfile) => {
    const docs = n.documents || [];
    return {
      noDocs: docs.length === 0,
      hasRejected: docs.some((d) => d.status === 'rejected'),
      hasPending: docs.some((d) => d.status === 'pending'),
      unverified: !n.isVerified,
      lowConfidence: docs.some((d) => (d.aiConfidence || 0) < 70),
    };
  };

  const filteredNannies = useMemo(() => {
    const q = query.trim().toLowerCase();

    const byQuery = (n: NannyProfile) =>
      !q ||
      [n.name, n.city, n.about, n.contact, (n.skills || []).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q);

    const byIssue = (n: NannyProfile) => {
      const f = getNannyFlags(n);
      if (issueFilter === 'all') return true;
      if (issueFilter === 'noDocs') return f.noDocs;
      if (issueFilter === 'rejected') return f.hasRejected;
      if (issueFilter === 'pending') return f.hasPending;
      if (issueFilter === 'unverified') return f.unverified;
      return true;
    };

    return nannies.filter((n) => {
      const flags = getNannyFlags(n);
      const isProblematic =
        flags.noDocs ||
        flags.hasRejected ||
        flags.hasPending ||
        flags.unverified ||
        flags.lowConfidence;
      return byQuery(n) && (!onlyProblematic || isProblematic) && byIssue(n);
    });
  }, [nannies, query, onlyProblematic, issueFilter]);

  const { toggleVerified, updateDocumentStatus, bulkVerifyVisible, bulkSetDocsStatusVisible } =
    useAdminNannyModeration({
      filteredNannies,
      onDataChanged,
      logAdminAction,
    });

  // Тяжёлые детали (готовность, поведение, документы, отзывы) показываем внутри
  // карточки по клику — список остаётся читаемым превью без перегруза.
  const renderNannyDetail = (n: NannyProfile) => {
    const docs = n.documents || [];
    const readiness = getNannyReadinessSnapshot(n);
    return (
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <AdminPillButton
            onClick={() => toggleVerified(n)}
            tone={n.isVerified ? 'neutral' : 'primary'}
          >
            {n.isVerified ? 'Снять верификацию' : 'Подтвердить профиль'}
          </AdminPillButton>
          {n.video && (
            <AdminPillButton
              tone="neutral"
              className="flex items-center gap-2"
              onClick={() => window.open(n.video!, '_blank', 'noopener,noreferrer')}
            >
              <PlayCircle size={14} /> Смотреть видео
            </AdminPillButton>
          )}
          <AdminPillButton onClick={() => setCalendarNanny(n)} tone="neutral">
            Календарь занятости
          </AdminPillButton>
        </div>

        {n.about && (
          <div className={adminSubsectionPanel}>
            <div className="text-xs text-stone-500 mb-1">О себе</div>
            <div className="text-sm text-stone-700">{n.about}</div>
          </div>
        )}

        <div className={adminSubsectionPanel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-stone-400 font-bold">
                Готовность к показу
              </div>
              <div className="text-sm font-semibold text-stone-800 mt-1">
                {getNannyReadinessLabel(readiness, 'ru')}
              </div>
            </div>
            <div
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${readiness.qualityApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
            >
              {readiness.qualityScore}/100
            </div>
          </div>
          <ProgressBar
            className="mt-3"
            label="Готовность профиля"
            showPercent
            value={readiness.completionRatio}
          />
          {readiness.missingFields.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {readiness.missingFields.slice(0, 5).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-emerald-700 font-medium">
              Профиль соответствует минимуму качества и готов к показу семье.
            </div>
          )}
        </div>

        {n.softSkills && (
          <div className={adminSubsectionPanel}>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mb-1">
              <BrainCircuit size={12} /> Поведенческий профиль ({n.softSkills.dominantStyle})
            </div>
            <p className="text-[11px] text-stone-600 leading-snug">
              {n.softSkills.moderationSummary || n.softSkills.summary}
            </p>
            {n.softSkills.signals?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {n.softSkills.signals.slice(0, 3).map((signal) => (
                  <span
                    key={signal.signal}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      signal.direction === 'watch'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {getAssessmentSignalLabel(signal.signal, 'ru')}
                  </span>
                ))}
              </div>
            )}
            {n.softSkills.aiStructuredSummary?.moderationNotes && (
              <p className="mt-2 text-[10px] leading-tight text-stone-500">
                {n.softSkills.aiStructuredSummary.moderationNotes}
              </p>
            )}
          </div>
        )}

        {docs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-stone-500">Документы</div>
            {docs.map((doc, idx) => (
              <div key={idx} className={adminSubsectionPanel}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 size={14} className="text-stone-500" />
                    <span className="text-xs font-semibold text-stone-700">
                      {docTypeLabel(doc.type)}
                    </span>
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                      {doc.status === 'verified'
                        ? 'проверено'
                        : doc.status === 'pending'
                          ? 'на проверке'
                          : 'отклонено'}
                    </span>
                    <AdminPillButton
                      onClick={async () => {
                        const path = doc.fileStoragePath;
                        const url = path ? await getNannyDocSignedUrl(path) : doc.fileDataUrl;
                        if (!url) {
                          reportError(
                            'Файл не прикреплён к этой записи. Перезагрузите документ заново.',
                          );
                          return;
                        }
                        setPreviewDoc({ url, name: doc.fileName || 'document' });
                      }}
                      tone="neutral"
                      className={`px-2.5 py-1 text-[10px] ${doc.fileStoragePath || doc.fileDataUrl ? '' : 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-100 hover:border-stone-200'}`}
                    >
                      Просмотр
                    </AdminPillButton>
                  </div>
                </div>
                {doc.aiNotes && (
                  <div className="text-[10px] text-stone-600 mt-1 italic">{doc.aiNotes}</div>
                )}
                <div className="flex gap-1 mt-2">
                  {(['verified', 'rejected'] as const).map((s) => (
                    <AdminPillButton
                      key={s}
                      onClick={() => updateDocumentStatus(n, idx, s)}
                      active={doc.status === s}
                      tone="neutral"
                      className="px-2.5 py-1 text-[10px]"
                    >
                      {s === 'verified' ? 'проверено' : 'отклонить'}
                    </AdminPillButton>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {n.reviews && n.reviews.length > 0 && (
          <div className={adminSubsectionPanel}>
            <div className="text-xs font-semibold text-stone-500 mb-2">
              Отзывы ({n.reviews.length})
            </div>
            <div className="space-y-2">
              {n.reviews.map((r: Review, idx: number) => (
                <div key={idx} className="rounded-[1rem] bg-white/70 px-3 py-2">
                  <div className="flex justify-between">
                    <div className="text-xs font-semibold text-stone-700">
                      {r.authorName || 'Семья'}
                    </div>
                    {typeof r.rating === 'number' && (
                      <div className="text-[10px] text-stone-500">★ {r.rating}/5</div>
                    )}
                  </div>
                  {r.text && <div className="text-[11px] text-stone-600 mt-1">{r.text}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-stone-500 font-bold uppercase text-xs">Анкеты нянь</h3>
            <div className="mt-1 text-sm text-stone-600">
              {filteredNannies.length} в текущем срезе
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminPillButton
              onClick={async () => {
                const result = await copyNanniesOpsForTable(filteredNannies);
                if (result.ok) {
                  reportSuccess(result.message);
                  return;
                }
                reportInfo(result.message);
              }}
              tone="neutral"
            >
              Скопировать для таблицы
            </AdminPillButton>
            <AdminPillButton onClick={() => exportNanniesOpsCsv(filteredNannies)} tone="neutral">
              Выгрузить для команды
            </AdminPillButton>
            <AdminPillButton onClick={() => exportNanniesCsv(filteredNannies)} tone="neutral">
              Выгрузить CSV
            </AdminPillButton>
          </div>
        </div>

        <div className={`${adminSectionPanel} mb-3`}>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Все'],
                ['noDocs', 'Без документов'],
                ['rejected', 'Есть отклонённые'],
                ['pending', 'Есть на проверке'],
                ['unverified', 'Не верифицированы'],
              ] as const
            ).map(([key, label]) => (
              <AdminPillButton
                key={key}
                onClick={() => setIssueFilter(key)}
                active={issueFilter === key}
                tone="neutral"
              >
                {label}
              </AdminPillButton>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <AdminPillButton onClick={bulkVerifyVisible} tone="neutral">
              Массово: подтвердить профиль
            </AdminPillButton>
            <AdminPillButton onClick={() => bulkSetDocsStatusVisible('verified')} tone="neutral">
              Массово: документы подтверждены
            </AdminPillButton>
            <AdminPillButton onClick={() => bulkSetDocsStatusVisible('pending')} tone="neutral">
              Массово: документы на проверке
            </AdminPillButton>
          </div>
        </div>

        {filteredNannies.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
            Здесь пока пусто. Когда няни заполнят анкеты — они появятся в этом срезе.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNannies.map((n) => {
              const readiness = getNannyReadinessSnapshot(n);
              const trustBadges = getNannyTrustBadges(n);
              const riskFlags = getNannyRiskFlags(n);

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNanny(n)}
                  className="w-full rounded-[1.5rem] border border-[color:var(--cloud-border)] bg-white/80 p-3 text-left transition-all hover:-translate-y-px hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <span
                      role={n.photo ? 'button' : undefined}
                      aria-label={n.photo ? `Открыть фото ${n.name}` : undefined}
                      onClick={(e) => openPhotoZoom(e, n)}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 flex items-center justify-center ${n.photo ? 'cursor-zoom-in transition hover:ring-2 hover:ring-[color:var(--color-primary)]/40' : ''}`}
                    >
                      {n.photo ? (
                        <img src={n.photo} alt={n.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon size={32} className="text-stone-300" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-base font-semibold text-stone-900">
                          {n.name}
                        </span>
                        {n.isVerified && (
                          <ShieldCheck size={15} className="shrink-0 text-emerald-600" />
                        )}
                        <span
                          className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${readiness.qualityApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                        >
                          {readiness.qualityScore}/100
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-sm text-stone-600">
                        {[n.city, n.district].filter(Boolean).join(', ')} · опыт {n.experience} лет
                        {n.expectedRate ? ` · ${n.expectedRate}` : ''}
                      </div>
                      <div className="mt-2">
                        <TrustBadgeRow badges={trustBadges} />
                      </div>
                      {(n.softSkills?.dominantStyle || riskFlags.length > 0) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {n.softSkills?.dominantStyle && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                              {n.softSkills.dominantStyle}
                            </span>
                          )}
                          <RiskFlagRow flags={riskFlags} />
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-stone-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <AdminDocumentPreviewModal previewDoc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Карточка няни */}
      {selectedNanny && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <div className={`${adminModalSurface} w-full max-w-2xl max-h-[92vh] overflow-y-auto`}>
            <div className={adminModalHeader}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={
                    selectedNanny.photo ? `Открыть фото ${selectedNanny.name}` : undefined
                  }
                  onClick={(e) => openPhotoZoom(e, selectedNanny)}
                  disabled={!selectedNanny.photo}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 flex items-center justify-center ${selectedNanny.photo ? 'cursor-zoom-in transition hover:ring-2 hover:ring-[color:var(--color-primary)]/40' : ''}`}
                >
                  {selectedNanny.photo ? (
                    <img
                      src={selectedNanny.photo}
                      alt={selectedNanny.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon size={28} className="text-stone-300" />
                  )}
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-stone-800">{selectedNanny.name}</h3>
                    {selectedNanny.isVerified && (
                      <ShieldCheck size={15} className="text-emerald-600" />
                    )}
                  </div>
                  <div className="text-sm text-stone-500">
                    {[selectedNanny.city, selectedNanny.district].filter(Boolean).join(', ')} · опыт{' '}
                    {selectedNanny.experience} лет
                    {selectedNanny.expectedRate ? ` · ${selectedNanny.expectedRate}` : ''}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-400">{selectedNanny.contact}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedNanny(null)}
                className="p-2 rounded-full hover:bg-white/70"
              >
                <X size={18} />
              </button>
            </div>
            {renderNannyDetail(selectedNanny)}
          </div>
        </div>
      )}

      {/* Calendar modal */}
      {calendarNanny && (
        <div className="fixed inset-0 z-80 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${adminModalSurface} w-full max-w-3xl`}>
            <div className="hero-shell p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-stone-800">
                  Календарь няни: {calendarNanny.name}
                </div>
                <div className="text-xs text-stone-500">Просмотр администратором</div>
              </div>
              <button
                onClick={() => setCalendarNanny(null)}
                className="p-2 rounded-full hover:bg-stone-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50/70 text-amber-700 text-[11px] p-3">
                Здесь больше нет синтетического календаря. Показываем только то, что няня реально
                указала в анкете.
              </div>
              <div className={adminSectionPanel}>
                <div className="text-xs font-semibold text-stone-500 uppercase mb-2">
                  График из анкеты
                </div>
                <div className="text-sm text-stone-700">
                  {calendarNanny.schedule || 'Няня ещё не указала структурированный график.'}
                </div>
                <div className="mt-2 text-[11px] text-stone-500">
                  Для точной сетки занятости нужен отдельный серверный модуль доступности.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-stone-900/90 p-4 backdrop-blur-sm"
          onClick={() => setZoomedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedPhoto(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Закрыть фото"
          >
            <X size={20} />
          </button>
          <img
            src={zoomedPhoto.url}
            alt={zoomedPhoto.name}
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
