import React, { useMemo, useState } from 'react';
import { Card, Badge } from '../UI';
import { NannyProfile, DocumentVerification } from '../../types';
import { adminUpdateNannyProfile } from '../../services/adminApi';
import { getAssessmentSignalLabel } from '../../services/assessment';
import {
    getNannyReadinessLabel,
    getNannyReadinessSnapshot,
} from '../../services/nannyReadiness';
import {
    X,
    ShieldCheck,
    BrainCircuit,
    PlayCircle,
    User as UserIcon,
    FileCheck2,
} from 'lucide-react';
import {
    exportNanniesCsv,
    exportNanniesOpsCsv,
    copyNanniesOpsForTable,
} from './adminExportUtils';

type NannyIssueFilter = 'all' | 'noDocs' | 'rejected' | 'pending' | 'unverified';

interface AdminNanniesTabProps {
    nannies: NannyProfile[];
    query: string;
    onlyProblematic: boolean;
    onDataChanged: () => void;
    logAdminAction: (action: string, meta?: Record<string, any>) => void;
}

export const AdminNanniesTab: React.FC<AdminNanniesTabProps> = ({
    nannies,
    query,
    onlyProblematic,
    onDataChanged,
    logAdminAction,
}) => {
    const [issueFilter, setIssueFilter] = useState<NannyIssueFilter>('all');
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name?: string } | null>(null);
    const [calendarNanny, setCalendarNanny] = useState<NannyProfile | null>(null);

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

    const isProblematicNanny = (n: NannyProfile) => {
        const f = getNannyFlags(n);
        return f.noDocs || f.hasRejected || f.hasPending || f.unverified || f.lowConfidence;
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

        return nannies.filter(
            (n) => byQuery(n) && (!onlyProblematic || isProblematicNanny(n)) && byIssue(n)
        );
    }, [nannies, query, onlyProblematic, issueFilter]);

    const toggleVerified = async (nanny: NannyProfile) => {
        const updated = await adminUpdateNannyProfile(nanny.id, { isVerified: !nanny.isVerified });
        if (!updated) {
            alert('Не удалось обновить статус верификации на сервере.');
            return;
        }
        onDataChanged();
    };

    const updateDocumentStatus = async (
        nanny: NannyProfile,
        idx: number,
        status: DocumentVerification['status']
    ) => {
        const docs = [...(nanny.documents || [])];
        if (!docs[idx]) return;

        let adminNote =
            status === 'verified'
                ? 'Статус подтверждён администратором'
                : status === 'rejected'
                    ? 'Отклонено администратором'
                    : 'Ожидает ручной проверки';

        if (status === 'rejected') {
            const reason = prompt('Комментарий к отклонению документа (минимум 8 символов):', 'Нужен более читаемый документ или исправление данных');
            const text = (reason || '').trim();
            if (text.length < 8) {
                alert('Отклонение отменено: добавьте понятный комментарий (минимум 8 символов).');
                return;
            }
            adminNote = `Отклонено администратором: ${text}`;
        }

        docs[idx] = {
            ...docs[idx],
            status,
            aiNotes: adminNote,
            verifiedAt: Date.now(),
        };

        const updated = await adminUpdateNannyProfile(nanny.id, { documents: docs });
        if (!updated) {
            alert('Не удалось сохранить статус документа на сервере.');
            return;
        }
        onDataChanged();
    };

    const bulkVerifyVisible = async () => {
        if (filteredNannies.length === 0) return;
        if (!confirm(`Подтвердить профиль у ${filteredNannies.length} анкет?`)) return;
        logAdminAction('bulk_verify_profiles', { count: filteredNannies.length });
        const results = await Promise.all(filteredNannies.map((n) => adminUpdateNannyProfile(n.id, { isVerified: true })));
        if (results.some((item) => !item)) {
            alert('Часть профилей не удалось обновить на сервере.');
        }
        onDataChanged();
    };

    const bulkSetDocsStatusVisible = async (status: DocumentVerification['status']) => {
        if (filteredNannies.length === 0) return;
        if (!confirm(`Проставить статус '${status}' для документов у видимых анкет?`)) return;
        logAdminAction('bulk_docs_status', { status, count: filteredNannies.length });

        await Promise.all(
            filteredNannies.map(async (n) => {
                const docs = (n.documents || []).map((d) => ({
                    ...d,
                    status,
                    aiNotes:
                        status === 'verified'
                            ? 'Статус подтверждён администратором'
                            : status === 'rejected'
                                ? 'Отклонено администратором'
                                : 'Ожидает ручной проверки',
                    verifiedAt: Date.now(),
                }));
                if (docs.length > 0) {
                    await adminUpdateNannyProfile(n.id, { documents: docs });
                }
            })
        );
        onDataChanged();
    };

    return (
        <>
            <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-stone-500 font-bold uppercase text-xs">
                        Анкеты нянь ({filteredNannies.length})
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => copyNanniesOpsForTable(filteredNannies)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200"
                        >
                            Скопировать для таблицы
                        </button>
                        <button
                            onClick={() => exportNanniesOpsCsv(filteredNannies)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"
                        >
                            Выгрузить для Ops
                        </button>
                        <button
                            onClick={() => exportNanniesCsv(filteredNannies)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200"
                        >
                            Выгрузить CSV
                        </button>
                    </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                    {([
                        ['all', 'Все'],
                        ['noDocs', 'Без документов'],
                        ['rejected', 'Есть отклонённые'],
                        ['pending', 'Есть на проверке'],
                        ['unverified', 'Не верифицированы'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setIssueFilter(key)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border ${issueFilter === key
                                ? 'bg-stone-800 text-white border-stone-800'
                                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        onClick={bulkVerifyVisible}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                    >
                        Массово: подтвердить профиль
                    </button>
                    <button
                        onClick={() => bulkSetDocsStatusVisible('verified')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"
                    >
                        Массово: документы подтверждены
                    </button>
                    <button
                        onClick={() => bulkSetDocsStatusVisible('pending')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                    >
                        Массово: документы на проверке
                    </button>
                </div>

                {filteredNannies.length === 0 ? (
                    <div className="text-stone-400 text-sm">Пусто</div>
                ) : (
                    <div className="space-y-3">
                        {filteredNannies.map((n) => {
                            const docs = n.documents || [];
                            const readiness = getNannyReadinessSnapshot(n);
                            const isProb =
                                !n.isVerified ||
                                docs.length === 0 ||
                                docs.some((d) => d.status === 'rejected' || d.status === 'pending' || (d.aiConfidence || 0) < 70) ||
                                !readiness.readyForReview;

                            return (
                                <Card key={n.id} className={`!p-4 ${n.isVerified ? 'bg-green-50 border-green-100' : 'bg-sky-50/50'}`}>
                                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                                        <div className="flex items-center gap-2">
                                            {isProb && (
                                                <Badge variant="status">проблема</Badge>
                                            )}
                                            {n.isVerified && <ShieldCheck size={14} className="text-green-600" />}
                                            <span className="font-mono">{n.id.slice(0, 6)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 mt-2">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-stone-200 flex-shrink-0 flex items-center justify-center">
                                            {n.photo ? (
                                                <img src={n.photo} alt={n.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon size={24} className="text-stone-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-stone-800">{n.name}</div>
                                            <div className="text-sm text-stone-600">{n.city} • Опыт: {n.experience} лет</div>
                                            <div className="text-xs text-stone-500 mt-1">{n.contact}</div>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            onClick={() => toggleVerified(n)}
                                            className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${n.isVerified
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                                }`}
                                        >
                                            {n.isVerified ? 'Снять верификацию' : 'Подтвердить профиль'}
                                        </button>
                                        {n.video && (
                                            <button className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-lg transition-colors justify-center">
                                                <PlayCircle size={14} /> Смотреть видео
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setCalendarNanny(n)}
                                            className="text-xs font-bold px-3 py-2 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"
                                        >
                                            Календарь занятости
                                        </button>
                                    </div>

                                    <div className="mt-3 bg-white/80 p-3 rounded-xl border border-stone-100">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-[11px] uppercase tracking-wide text-stone-400 font-bold">
                                                    Quality funnel
                                                </div>
                                                <div className="text-sm font-semibold text-stone-800 mt-1">
                                                    {getNannyReadinessLabel(readiness, 'ru')}
                                                </div>
                                            </div>
                                            <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${readiness.qualityApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {readiness.qualityScore}/100
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                                            <span>Готовность профиля</span>
                                            <strong className="text-stone-700">{readiness.completionRatio}%</strong>
                                        </div>
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
                                                Профиль закрывает quality floor и готов к показу семье.
                                            </div>
                                        )}
                                    </div>

                                    {n.softSkills && (
                                        <div className="mt-3 bg-white p-2 rounded border border-stone-100">
                                            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mb-1">
                                                <BrainCircuit size={12} /> Поведенческий профиль ({n.softSkills.dominantStyle})
                                            </div>
                                            <p className="text-[10px] text-stone-500 leading-tight">
                                                {n.softSkills.moderationSummary || n.softSkills.summary}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-[10px] text-stone-400">
                                                <span>{n.softSkills.method || 'legacy_profile'}</span>
                                                <span>•</span>
                                                <span>coverage {Math.round((n.softSkills.coverage ?? 1) * 100)}%</span>
                                            </div>
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

                                    {n.documents && n.documents.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {n.documents.map((doc, idx) => (
                                                <div key={idx} className="bg-white p-2 rounded border border-stone-200">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <FileCheck2 size={14} className="text-stone-500" />
                                                            <span className="text-xs font-bold text-stone-700 uppercase">
                                                                {doc.type === 'passport' ? 'ПАСПОРТ'
                                                                    : doc.type === 'medical_book' ? 'МЕДКНИЖКА'
                                                                        : doc.type === 'recommendation_letter' ? 'РЕКОМЕНДАЦИЯ'
                                                                            : doc.type === 'education_document' ? 'ОБРАЗОВАНИЕ'
                                                                                : doc.type === 'resume' ? 'РЕЗЮМЕ'
                                                                                    : 'ДОКУМЕНТ'}
                                                            </span>
                                                            <span className="text-[10px] bg-stone-100 text-stone-500 px-1 rounded">
                                                                {doc.status === 'verified' ? 'проверено'
                                                                    : doc.status === 'pending' ? 'загружено'
                                                                        : 'отклонено'}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    if (!doc.fileDataUrl) {
                                                                        alert('Файл не прикреплён к этой записи. Перезагрузите резюме заново.');
                                                                        return;
                                                                    }
                                                                    setPreviewDoc({ url: doc.fileDataUrl, name: doc.fileName || 'document' });
                                                                }}
                                                                className={`text-[10px] px-2 py-0.5 rounded ${doc.fileDataUrl ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-stone-100 text-stone-400'}`}
                                                            >
                                                                Просмотр
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-stone-600 mt-1 italic">{doc.aiNotes}</div>
                                                    <div className="flex gap-1 mt-2">
                                                        {(['verified', 'rejected'] as const).map((s) => (
                                                            <button
                                                                key={s}
                                                                onClick={() => updateDocumentStatus(n, idx, s)}
                                                                className={`text-[10px] px-2 py-1 rounded ${doc.status === s
                                                                    ? 'bg-stone-800 text-white'
                                                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                                    }`}
                                                            >
                                                                {s === 'verified' ? 'проверено' : 'отклонить'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {n.reviews && n.reviews.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-stone-200/50">
                                            <div className="text-xs font-bold text-stone-500 mb-2">Отзывы ({n.reviews.length})</div>
                                            <div className="space-y-2">
                                                {n.reviews.map((r: any, idx: number) => (
                                                    <div key={idx} className="bg-white p-2 rounded border border-stone-100">
                                                        <div className="flex justify-between">
                                                            <div className="text-xs font-semibold text-stone-700">{r?.author ?? 'Parent'}</div>
                                                            {typeof r?.rating === 'number' && (
                                                                <div className="text-[10px] text-stone-500">★ {r.rating}/5</div>
                                                            )}
                                                        </div>
                                                        {r?.text && <div className="text-[10px] text-stone-600 mt-1">{r.text}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Document preview modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-[80] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-stone-100 flex items-center justify-between">
                            <div className="text-sm font-semibold text-stone-800 truncate pr-4">{previewDoc.name || 'Документ'}</div>
                            <div className="flex items-center gap-2">
                                <a href={previewDoc.url} download={previewDoc.name || 'document'} className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200">
                                    Скачать
                                </a>
                                <button onClick={() => setPreviewDoc(null)} className="p-2 rounded-full hover:bg-stone-100">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        {String(previewDoc.url).startsWith('data:image/') ? (
                            <div className="flex-1 overflow-auto bg-stone-50 p-4">
                                <img src={previewDoc.url} alt={previewDoc.name || 'preview'} className="max-w-full mx-auto rounded border border-stone-200" />
                            </div>
                        ) : (
                            <iframe title="document-preview" src={previewDoc.url} className="flex-1 w-full" />
                        )}
                    </div>
                </div>
            )}

            {/* Calendar modal */}
            {calendarNanny && (
                <div className="fixed inset-0 z-[80] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-stone-800">Календарь няни: {calendarNanny.name}</div>
                                <div className="text-xs text-stone-500">Просмотр администратором</div>
                            </div>
                            <button onClick={() => setCalendarNanny(null)} className="p-2 rounded-full hover:bg-stone-100">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-[11px] rounded-lg p-2">
                                Здесь больше нет синтетического календаря. Показываем только то, что няня реально указала в анкете.
                            </div>
                            <Card className="!p-4 bg-stone-50 border-stone-100">
                                <div className="text-xs font-semibold text-stone-500 uppercase mb-2">График из анкеты</div>
                                <div className="text-sm text-stone-700">
                                    {calendarNanny.schedule || 'Няня ещё не указала структурированный график.'}
                                </div>
                                <div className="mt-2 text-[11px] text-stone-500">
                                    Для точной сетки занятости нужен отдельный server-backed availability layer.
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
