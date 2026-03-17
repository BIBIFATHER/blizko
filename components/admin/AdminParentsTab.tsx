import React, { useState } from 'react';
import { Card, Badge } from '../UI';
import { ParentRequest, DocumentVerification } from '../../types';
import { X } from 'lucide-react';
import { updateParentRequest } from '../../services/storage';
import { notifyUserStatusChanged } from '../../services/notifications';

type ParentStatusFilter = 'all' | 'new' | 'in_review' | 'approved' | 'rejected' | 'resubmitted';
type ParentWorkflowStatus = NonNullable<ParentRequest['status']>;

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
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name?: string } | null>(null);

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

    const parentStatusBadge = (status?: ParentRequest['status']) => {
        if (status === 'payment_pending') return 'bg-stone-100 text-stone-700';
        if (status === 'in_review') return 'bg-amber-100 text-amber-700';
        if (status === 'approved') return 'bg-green-100 text-green-700';
        if (status === 'rejected') return 'bg-red-100 text-red-700';
        return 'bg-sky-100 text-sky-700';
    };

    const setParentStatus = async (parent: ParentRequest, status: ParentWorkflowStatus) => {
        const updated = await updateParentRequest(
            { id: parent.id, status },
            { actor: 'admin', note: `Админ изменил статус на: ${status}`, allowApprovedEdit: true }
        );
        if (updated) await notifyUserStatusChanged(updated);
        onDataChanged();
        if (selectedParent?.id === parent.id) {
            setSelectedParent({ ...parent, status });
        }
    };

    const rejectParentWithReason = async (parent: ParentRequest) => {
        const reasonMap = {
            profile_incomplete: 'Анкета заполнена не полностью',
            docs_missing: 'Не хватает документов',
            budget_invalid: 'Некорректный бюджет',
            contact_invalid: 'Некорректные контактные данные',
            other: 'Другая причина',
        } as const;

        let reasonText = (rejectReasonText || '').trim();
        if (reasonText.length < 8) {
            const typed = prompt('Добавьте комментарий к отклонению анкеты (минимум 8 символов):', 'Пожалуйста, дополните анкету и исправьте замечания модератора');
            reasonText = (typed || '').trim();
        }
        if (reasonText.length < 8) {
            alert('Укажи комментарий минимум 8 символов, чтобы пользователь понял что исправить.');
            return;
        }
        if (reasonText !== rejectReasonText) {
            setRejectReasonText(reasonText);
        }

        const note = `Отклонено: ${reasonMap[rejectReasonCode]}. ${reasonText}`;

        const updated = await updateParentRequest(
            {
                id: parent.id,
                status: 'rejected',
                rejectionInfo: {
                    reasonCode: rejectReasonCode,
                    reasonText,
                    rejectedAt: Date.now(),
                    rejectedBy: 'admin',
                },
            },
            { actor: 'admin', note, allowApprovedEdit: true, forceStatusEvent: true }
        );

        if (updated) await notifyUserStatusChanged(updated);
        setRejectReasonText('');
        onDataChanged();
    };

    return (
        <>
            <section>
                <h3 className="text-stone-500 font-bold uppercase text-xs mb-3">
                    Заявки родителей ({filteredParents.length})
                </h3>

                <div className="mb-3 flex flex-wrap gap-2">
                    {([
                        ['all', 'Все'],
                        ['new', 'Новые'],
                        ['in_review', 'На проверке'],
                        ['resubmitted', 'Повторно отправленные'],
                        ['approved', 'Одобрены'],
                        ['rejected', 'Отклонены'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setParentStatusFilter(key)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border ${parentStatusFilter === key
                                ? 'bg-stone-800 text-white border-stone-800'
                                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <label className="mb-3 inline-flex items-center gap-2 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                    <input
                        type="checkbox"
                        checked={onlyNeedsAction}
                        onChange={(e) => setOnlyNeedsAction(e.target.checked)}
                    />
                    Только требуют действия
                </label>

                <div className="mb-3 bg-red-50 border border-red-100 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-semibold text-red-700">Причина отклонения (для доработки анкеты)</div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={rejectReasonCode}
                            onChange={(e) => setRejectReasonCode(e.target.value as any)}
                            className="text-xs border border-red-200 rounded px-2 py-1 bg-white"
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
                            className="flex-1 min-w-[220px] text-xs border border-red-200 rounded px-2 py-1"
                        />
                    </div>
                </div>

                {filteredParents.length === 0 ? (
                    <p className="text-stone-400 text-sm">Пусто</p>
                ) : (
                    <div className="space-y-3">
                        {filteredParents.map((p) => (
                            <Card key={p.id} className="!p-4 bg-amber-50/50">
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
                                    <button
                                        onClick={() => setParentStatus(p, 'in_review')}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                                    >
                                        На проверку
                                    </button>
                                    <button
                                        onClick={() => setParentStatus(p, 'approved')}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                                    >
                                        Одобрить
                                    </button>
                                    <button
                                        onClick={() => rejectParentWithReason(p)}
                                        disabled={rejectReasonText.trim().length < 8}
                                        title={rejectReasonText.trim().length < 8 ? 'Добавь комментарий (минимум 8 символов)' : 'Отклонить с причиной'}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${rejectReasonText.trim().length < 8
                                            ? 'bg-red-50 text-red-300 cursor-not-allowed'
                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                            }`}
                                    >
                                        Отклонить
                                    </button>
                                    <button
                                        onClick={() => setSelectedParent(p)}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200"
                                    >
                                        Открыть анкету
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Selected parent detail modal */}
            {selectedParent && (
                <div className="fixed inset-0 z-[60] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                            <h3 className="font-bold text-stone-800">Анкета родителя</h3>
                            <button onClick={() => setSelectedParent(null)} className="p-2 rounded-full hover:bg-stone-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-stone-50 rounded-lg p-3">
                                    <div className="text-xs text-stone-500">Город</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.city}</div>
                                </div>
                                <div className="bg-stone-50 rounded-lg p-3">
                                    <div className="text-xs text-stone-500">Возраст ребёнка</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.childAge}</div>
                                </div>
                                <div className="bg-stone-50 rounded-lg p-3">
                                    <div className="text-xs text-stone-500">График</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.schedule}</div>
                                </div>
                                <div className="bg-stone-50 rounded-lg p-3">
                                    <div className="text-xs text-stone-500">Бюджет</div>
                                    <div className="font-semibold text-stone-800">{selectedParent.budget}</div>
                                </div>
                            </div>

                            <div className="bg-stone-50 rounded-lg p-3">
                                <div className="text-xs text-stone-500 mb-1">Требования</div>
                                <div className="text-stone-700">
                                    {selectedParent.requirements?.length
                                        ? selectedParent.requirements.join(', ')
                                        : 'Не указаны'}
                                </div>
                            </div>

                            <div className="bg-stone-50 rounded-lg p-3">
                                <div className="text-xs text-stone-500 mb-1">Комментарий</div>
                                <div className="text-stone-700">{selectedParent.comment || 'Нет комментария'}</div>
                            </div>

                            <div className="bg-stone-50 rounded-lg p-3">
                                <div className="text-xs text-stone-500 mb-1">Документы</div>
                                {!selectedParent.documents?.length ? (
                                    <div className="text-stone-500">Нет документов</div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedParent.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white border border-stone-100 rounded p-2">
                                                <div className="text-xs text-stone-700">{(doc.fileName && !String(doc.fileName).startsWith('data:')) ? doc.fileName : `${doc.type}.pdf`}</div>
                                                {doc.fileDataUrl ? (
                                                    <button
                                                        onClick={() => setPreviewDoc({ url: doc.fileDataUrl!, name: doc.fileName || 'document' })}
                                                        className="text-[10px] px-2 py-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
                                                    >
                                                        Просмотр
                                                    </button>
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
                                <span className="text-[10px] px-2 py-1 rounded bg-stone-100 text-stone-600">
                                    Обновлено: {new Date(selectedParent.updatedAt || selectedParent.createdAt).toLocaleString()}
                                </span>
                            </div>

                            {!!selectedParent.changeLog?.length && (
                                <div className="bg-stone-50 rounded-lg p-3">
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

            {/* Document preview modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-[80] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-stone-100 flex items-center justify-between">
                            <div className="text-sm font-semibold text-stone-800 truncate pr-4">{previewDoc.name || 'Документ'}</div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewDoc.url}
                                    download={previewDoc.name || 'document'}
                                    className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
                                >
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
        </>
    );
};
