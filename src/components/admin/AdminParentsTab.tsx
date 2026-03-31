import React, { useState } from 'react';
import { Card, Badge } from '../UI';
import { ParentRequest } from '@/core/types';
import { X } from 'lucide-react';
import { AdminDocumentPreviewModal, AdminPillButton, adminModalHeader, adminModalSurface, adminSectionPanel, adminSubsectionPanel } from './adminPrimitives';
import { AdminPreviewDoc } from './adminModerationUtils';
import { useAdminParentModeration } from '@/hooks/useAdminParentModeration';

type ParentStatusFilter = 'all' | 'new' | 'in_review' | 'approved' | 'rejected' | 'resubmitted';

interface AdminParentsTabProps {
    parents: ParentRequest[];
    query: string;
    onDataChanged: () => void;
}

export const AdminParentsTab: React.FC<AdminParentsTabProps> = ({
    parents,
    query,
    onDataChanged,
}) => {
    const [parentStatusFilter, setParentStatusFilter] = useState<ParentStatusFilter>('all');
    const [onlyNeedsAction, setOnlyNeedsAction] = useState(true);
    const [selectedParent, setSelectedParent] = useState<ParentRequest | null>(null);
    const [rejectReasonCode, setRejectReasonCode] = useState<'profile_incomplete' | 'docs_missing' | 'budget_invalid' | 'contact_invalid' | 'other'>('profile_incomplete');
    const [rejectReasonText, setRejectReasonText] = useState('');
    const [previewDoc, setPreviewDoc] = useState<AdminPreviewDoc | null>(null);
    const { updateParentStatus, rejectParent } = useAdminParentModeration({
        onDataChanged,
        selectedParent,
        setSelectedParent,
        rejectReasonCode,
        rejectReasonText,
        setRejectReasonText,
    });

    const filteredParents = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return parents.filter((p) => {
            const status = p.status || 'new';
            const isResubmitted = (p.changeLog || []).some((e) => e.type === 'resubmitted');
            const byStatus =
                parentStatusFilter === 'all' ||
                status === parentStatusFilter ||
                (parentStatusFilter === 'resubmitted' && isResubmitted && status === 'in_review');
            const byNeedsAction = !onlyNeedsAction || status === 'new' || status === 'in_review' || status === 'rejected';
            const byQuery =
                !q ||
                p.city.toLowerCase().includes(q) ||
                p.comment.toLowerCase().includes(q) ||
                p.requirements.join(' ').toLowerCase().includes(q);
            return byStatus && byNeedsAction && byQuery;
        });
    }, [parents, query, parentStatusFilter, onlyNeedsAction]);

    const parentStatusLabel = (status?: ParentRequest['status']) => {
        if (status === 'payment_pending') return 'Ожидает оплаты';
        if (status === 'in_review') return 'На проверке';
        if (status === 'approved') return 'Одобрена';
        if (status === 'rejected') return 'Отклонена';
        return 'Новая';
    };

    return (
        <>
            <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-stone-500 font-bold uppercase text-xs">
                            Заявки родителей
                        </h3>
                        <div className="mt-1 text-sm text-stone-600">
                            {filteredParents.length} в текущем срезе
                        </div>
                    </div>
                    <Badge variant={onlyNeedsAction ? 'warning' : 'neutral'}>
                        {onlyNeedsAction ? 'Только action-needed' : 'Все заявки'}
                    </Badge>
                </div>

                <div className={`${adminSectionPanel} mb-3`}>
                    <div className="mb-3 flex flex-wrap gap-2">
                    {([
                        ['all', 'Все'],
                        ['new', 'Новые'],
                        ['in_review', 'На проверке'],
                        ['resubmitted', 'Повторно отправленные'],
                        ['approved', 'Одобрены'],
                        ['rejected', 'Отклонены'],
                    ] as const).map(([key, label]) => (
                        <AdminPillButton
                            key={key}
                            onClick={() => setParentStatusFilter(key)}
                            active={parentStatusFilter === key}
                            tone="neutral"
                        >
                            {label}
                        </AdminPillButton>
                    ))}
                    </div>

                    <label className="mb-3 inline-flex items-center gap-2 rounded-full border border-stone-200/70 bg-white/70 px-3 py-2 text-xs text-stone-700">
                        <input
                            type="checkbox"
                            checked={onlyNeedsAction}
                            onChange={(e) => setOnlyNeedsAction(e.target.checked)}
                        />
                        Только требуют действия
                    </label>

                    <div className="rounded-[1.25rem] border border-red-100/80 bg-red-50/70 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold text-red-700">Причина отклонения</div>
                            <Badge variant="danger">Нужно объяснение семье</Badge>
                        </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={rejectReasonCode}
                            onChange={(e) => setRejectReasonCode(e.target.value as any)}
                            className="input-glass min-h-[40px] rounded-full border-red-200/80 px-3 py-2 text-xs"
                        >
                            <option value="profile_incomplete">Анкета заполнена не полностью</option>
                            <option value="docs_missing">Не хватает документов</option>
                            <option value="budget_invalid">Некорректный бюджет</option>
                            <option value="contact_invalid">Некорректные контакты</option>
                            <option value="other">Другая причина</option>
                        </select>
                        <input
                            value={rejectReasonText}
                            onChange={(e) => setRejectReasonText(e.target.value)}
                            placeholder="Комментарий для пользователя"
                            className="input-glass min-h-[40px] min-w-[220px] flex-1 rounded-full border-red-200/80 px-3 py-2 text-xs"
                        />
                    </div>
                </div>
                </div>

                {filteredParents.length === 0 ? (
                    <p className="text-stone-400 text-sm">Пусто</p>
                ) : (
                    <div className="space-y-3">
                        {filteredParents.map((p) => (
                            <Card key={p.id} className="p-4!">
                                <div className="flex justify-between text-xs text-stone-400 mb-1">
                                    <span>{new Date(p.createdAt).toLocaleString()}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={p.status === 'approved' ? 'trust' : p.status === 'rejected' ? 'status' : 'info'}>
                                            {parentStatusLabel(p.status)}
                                        </Badge>
                                        <span className="font-mono">{p.id.slice(0, 6)}</span>
                                    </div>
                                </div>

                                <div className="text-sm font-semibold text-stone-800">
                                    {p.city} • {p.childAge}
                                </div>
                                <div className="text-sm text-stone-600 mt-1">График: {p.schedule}</div>
                                <div className="text-sm text-stone-600">Бюджет: {p.budget}</div>
                                {!!p.requirements?.length && (
                                    <div className="text-xs text-stone-600 mt-1">
                                        Требования: {p.requirements.join(', ')}
                                    </div>
                                )}
                                {p.comment && (
                                    <div className="text-xs text-stone-500 mt-2 italic">"{p.comment}"</div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <AdminPillButton
                                        onClick={() => updateParentStatus(p, 'in_review')}
                                        tone="warm"
                                    >
                                        На проверку
                                    </AdminPillButton>
                                    <AdminPillButton
                                        onClick={() => updateParentStatus(p, 'approved')}
                                        tone="success"
                                    >
                                        Одобрить
                                    </AdminPillButton>
                                    <AdminPillButton
                                        onClick={() => rejectParent(p)}
                                        disabled={rejectReasonText.trim().length < 8}
                                        title={rejectReasonText.trim().length < 8 ? 'Добавь комментарий (минимум 8 символов)' : 'Отклонить с причиной'}
                                        tone="danger"
                                        className={rejectReasonText.trim().length < 8 ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed hover:bg-red-50' : ''}
                                    >
                                        Отклонить
                                    </AdminPillButton>
                                    <AdminPillButton
                                        onClick={() => setSelectedParent(p)}
                                        tone="neutral"
                                    >
                                        Открыть анкету
                                    </AdminPillButton>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Selected parent detail modal */}
            {selectedParent && (
                <div className="fixed inset-0 z-60 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`${adminModalSurface} w-full max-w-xl`}>
                        <div className={adminModalHeader}>
                            <div>
                                <div className="eyebrow">Parent request</div>
                                <h3 className="font-bold text-stone-800">Анкета родителя</h3>
                                <div className="section-body mt-1">Проверка заявки, документов и истории изменений в одном окне.</div>
                            </div>
                            <button onClick={() => setSelectedParent(null)} className="p-2 rounded-full hover:bg-white/70">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className={adminSubsectionPanel}>
                                    <div className="text-xs text-stone-500">Город</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.city}</div>
                                </div>
                                <div className={adminSubsectionPanel}>
                                    <div className="text-xs text-stone-500">Возраст ребёнка</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.childAge}</div>
                                </div>
                                <div className={adminSubsectionPanel}>
                                    <div className="text-xs text-stone-500">График</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.schedule}</div>
                                </div>
                                <div className={adminSubsectionPanel}>
                                    <div className="text-xs text-stone-500">Бюджет</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.budget}</div>
                                </div>
                            </div>

                            <div className={adminSubsectionPanel}>
                                <div className="text-xs text-stone-500 mb-1">Требования</div>
                                <div className="text-stone-700">
                                    {selectedParent.requirements?.length
                                        ? selectedParent.requirements.join(', ')
                                        : 'Не указаны'}
                                </div>
                            </div>

                            <div className={adminSubsectionPanel}>
                                <div className="text-xs text-stone-500 mb-1">Комментарий</div>
                                <div className="text-stone-700">{selectedParent.comment || 'Нет комментария'}</div>
                            </div>

                            <div className={adminSubsectionPanel}>
                                <div className="text-xs text-stone-500 mb-1">Документы</div>
                                {!selectedParent.documents?.length ? (
                                    <div className="text-stone-500">Нет документов</div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedParent.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-[1rem] border border-stone-200/70 bg-white/80 p-2">
                                                <div className="text-xs text-stone-700">{(doc.fileName && !String(doc.fileName).startsWith('data:')) ? doc.fileName : `${doc.type}.pdf`}</div>
                                                {doc.fileDataUrl ? (
                                                    <AdminPillButton
                                                        onClick={() => setPreviewDoc({ url: doc.fileDataUrl!, name: doc.fileName || 'document' })}
                                                        tone="neutral"
                                                        className="px-2.5 py-1 text-[10px]"
                                                    >
                                                        Просмотр
                                                    </AdminPillButton>
                                                ) : (
                                                    <span className="text-[10px] text-stone-400">Файл недоступен</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-stone-400 flex items-center justify-between pt-1">
                                <span>ID: {selectedParent.id}</span>
                                <span>{new Date(selectedParent.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="pt-2 flex items-center gap-2">
                                <Badge variant={selectedParent.status === 'approved' ? 'trust' : selectedParent.status === 'rejected' ? 'status' : 'info'}>
                                    Статус: {parentStatusLabel(selectedParent.status)}
                                </Badge>
                                <span className="text-[10px] px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                                    Обновлено: {new Date(selectedParent.updatedAt || selectedParent.createdAt).toLocaleString()}
                                </span>
                            </div>

                            {!!selectedParent.changeLog?.length && (
                                <div className={adminSubsectionPanel}>
                                    <div className="text-xs text-stone-500 mb-2">История изменений</div>
                                    <div className="space-y-1">
                                        {[...selectedParent.changeLog].slice(-6).reverse().map((item, idx) => (
                                            <div key={idx} className="text-xs text-stone-600 flex items-center justify-between gap-2">
                                                <span>{item.note || item.type}</span>
                                                <span className="text-stone-400">{new Date(item.at).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <AdminDocumentPreviewModal previewDoc={previewDoc} onClose={() => setPreviewDoc(null)} />
        </>
    );
};
