import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { ParentRequest } from '@/core/types';
import { adminUpdateParentRequest } from '@/services/adminApi';
import { notifyUserStatusChanged } from '@/services/notifications';
import { useAdminWorkflowUI } from '@/components/admin/adminWorkflowUI';

type ParentWorkflowStatus = NonNullable<ParentRequest['status']>;
type RejectReasonCode =
    | 'profile_incomplete'
    | 'docs_missing'
    | 'budget_invalid'
    | 'contact_invalid'
    | 'other';

const rejectReasonLabelMap: Record<RejectReasonCode, string> = {
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
    rejectReasonCode: RejectReasonCode;
    rejectReasonText: string;
    setRejectReasonText: Dispatch<SetStateAction<string>>;
}

export const useAdminParentModeration = ({
    onDataChanged,
    selectedParent,
    setSelectedParent,
    rejectReasonCode,
    rejectReasonText,
    setRejectReasonText,
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

            await notifyUserStatusChanged(updated);
            onDataChanged();
            syncSelectedParent(parent.id, updated);
            reportSuccess(`Статус заявки обновлён: ${status}.`);
            return updated;
        },
        [onDataChanged, reportError, reportSuccess, syncSelectedParent]
    );

    const rejectParent = useCallback(
        async (parent: ParentRequest) => {
            let reasonText = rejectReasonText.trim();

            if (reasonText.length < 8) {
                const promptedReason = await promptForReason({
                    promptText: 'Добавьте комментарий к отклонению анкеты (минимум 8 символов):',
                    defaultValue:
                        'Пожалуйста, дополните анкету и исправьте замечания модератора',
                    invalidMessage:
                        'Укажи комментарий минимум 8 символов, чтобы пользователь понял что исправить.',
                });

                if (!promptedReason) return null;
                reasonText = promptedReason;
            }

            if (reasonText !== rejectReasonText) {
                setRejectReasonText(reasonText);
            }

            const updated = await adminUpdateParentRequest({
                id: parent.id,
                changes: {
                    status: 'rejected',
                    rejectionInfo: {
                        reasonCode: rejectReasonCode,
                        reasonText,
                        rejectedAt: Date.now(),
                        rejectedBy: 'admin',
                    },
                },
                note: `Отклонено: ${rejectReasonLabelMap[rejectReasonCode]}. ${reasonText}`,
                forceStatusEvent: true,
            });

            if (!updated) {
                reportError('Не удалось сохранить отклонение на сервере.');
                return null;
            }

            await notifyUserStatusChanged(updated);
            setRejectReasonText('');
            onDataChanged();
            syncSelectedParent(parent.id, updated);
            reportSuccess('Заявка отклонена с комментарием модератора.');
            return updated;
        },
        [
            onDataChanged,
            promptForReason,
            rejectReasonCode,
            rejectReasonText,
            reportError,
            reportSuccess,
            setRejectReasonText,
            syncSelectedParent,
        ]
    );

    return {
        updateParentStatus,
        rejectParent,
    };
};
