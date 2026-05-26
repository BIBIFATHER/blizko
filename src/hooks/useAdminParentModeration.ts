import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { ParentRequest } from '@/core/types';
import { adminUpdateParentRequest } from '@/services/adminApi';
import { notifyUserStatusChanged } from '@/services/notifications';
import { useAdminWorkflowUI } from '@/components/admin/adminWorkflowUI';

type ParentWorkflowStatus = NonNullable<ParentRequest['status']>;
export type RejectReasonCode =
    | 'profile_incomplete'
    | 'docs_missing'
    | 'budget_invalid'
    | 'contact_invalid'
    | 'other';

export const rejectReasonLabelMap: Record<RejectReasonCode, string> = {
    profile_incomplete: 'Анкета заполнена не полностью',
    docs_missing: 'Не хватает документов',
    budget_invalid: 'Некорректный бюджет',
    contact_invalid: 'Некорректные контактные данные',
    other: 'Другая причина',
};

interface UseAdminParentModerationParams {
    onDataChanged: () => void;
    selectedParent: ParentRequest | null;
    setSelectedParent: Dispatch<SetStateAction<ParentRequest | null>>;
}

export const useAdminParentModeration = ({
    onDataChanged,
    selectedParent,
    setSelectedParent,
}: UseAdminParentModerationParams) => {
    const { promptForReason, reportError, reportSuccess } = useAdminWorkflowUI();

    const syncSelectedParent = useCallback(
        (parentId: string, updated: ParentRequest) => {
            if (selectedParent?.id === parentId) {
                setSelectedParent(updated);
            }
        },
        [selectedParent?.id, setSelectedParent]
    );

    const updateParentStatus = useCallback(
        async (parent: ParentRequest, status: ParentWorkflowStatus) => {
            const updated = await adminUpdateParentRequest({
                id: parent.id,
                changes: { status },
                note: `Админ изменил статус на: ${status}`,
            });

            if (!updated) {
                reportError('Не удалось сохранить статус на сервере.');
                return null;
            }

            const notified = await notifyUserStatusChanged(updated);
            onDataChanged();
            syncSelectedParent(parent.id, updated);
            if (notified) {
                reportSuccess(`Статус заявки обновлён: ${status}.`);
            } else {
                reportError(`Статус обновлён: ${status}, но уведомление семье не доставлено. Отправьте вручную.`);
            }
            return updated;
        },
        [onDataChanged, reportError, reportSuccess, syncSelectedParent]
    );

    const rejectParent = useCallback(
        async (parent: ParentRequest, reasonCode: RejectReasonCode, reasonText: string) => {
            let finalText = reasonText.trim();

            if (finalText.length < 8) {
                const prompted = await promptForReason({
                    promptText: 'Добавьте комментарий к отклонению анкеты (минимум 8 символов):',
                    defaultValue: 'Пожалуйста, дополните анкету и исправьте замечания модератора',
                    invalidMessage: 'Укажи комментарий минимум 8 символов, чтобы пользователь понял что исправить.',
                });
                if (!prompted) return null;
                finalText = prompted;
            }

            const updated = await adminUpdateParentRequest({
                id: parent.id,
                changes: {
                    status: 'rejected',
                    rejectionInfo: {
                        reasonCode,
                        reasonText: finalText,
                        rejectedAt: Date.now(),
                        rejectedBy: 'admin',
                    },
                },
                note: `Отклонено: ${rejectReasonLabelMap[reasonCode]}. ${finalText}`,
                forceStatusEvent: true,
            });

            if (!updated) {
                reportError('Не удалось сохранить отклонение на сервере.');
                return null;
            }

            const notified = await notifyUserStatusChanged(updated);
            onDataChanged();
            syncSelectedParent(parent.id, updated);
            if (notified) {
                reportSuccess('Заявка отклонена с комментарием модератора.');
            } else {
                reportError('Заявка отклонена, но уведомление семье не доставлено. Отправьте вручную.');
            }
            return updated;
        },
        [onDataChanged, promptForReason, reportError, reportSuccess, syncSelectedParent]
    );

    return { updateParentStatus, rejectParent };
};
