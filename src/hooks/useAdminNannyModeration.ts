import { useCallback } from 'react';

import { DocumentVerification, NannyProfile } from '@/core/types';
import { adminUpdateNannyProfile } from '@/services/adminApi';
import {
    applyDocumentStatusAtIndex,
    applyDocumentStatusToAll,
} from '@/components/admin/adminModerationUtils';
import { useAdminWorkflowUI } from '@/components/admin/adminWorkflowUI';

interface UseAdminNannyModerationParams {
    filteredNannies: NannyProfile[];
    onDataChanged: () => void;
    logAdminAction: (action: string, meta?: Record<string, any>) => void;
}

export const useAdminNannyModeration = ({
    filteredNannies,
    onDataChanged,
    logAdminAction,
}: UseAdminNannyModerationParams) => {
    const { confirmAction, promptForReason, reportError, reportInfo, reportSuccess } =
        useAdminWorkflowUI();

    const toggleVerified = useCallback(
        async (nanny: NannyProfile) => {
            const updated = await adminUpdateNannyProfile(nanny.id, {
                isVerified: !nanny.isVerified,
            });

            if (!updated) {
                reportError('Не удалось обновить статус верификации на сервере.');
                return null;
            }

            onDataChanged();
            reportSuccess(
                updated.isVerified
                    ? 'Профиль подтверждён.'
                    : 'Верификация профиля снята.'
            );
            return updated;
        },
        [onDataChanged, reportError, reportSuccess]
    );

    const updateDocumentStatus = useCallback(
        async (
            nanny: NannyProfile,
            idx: number,
            status: DocumentVerification['status']
        ) => {
            const docs = [...(nanny.documents || [])];
            if (!docs[idx]) return null;

            let reasonText: string | undefined;

            if (status === 'rejected') {
                const prompted = await promptForReason({
                    promptText:
                        'Комментарий к отклонению документа (минимум 8 символов):',
                    defaultValue: 'Нужен более читаемый документ или исправление данных',
                    invalidMessage:
                        'Отклонение отменено: добавьте понятный комментарий (минимум 8 символов).',
                });

                if (!prompted) return null;
                reasonText = prompted;
            }

            const nextDocs = applyDocumentStatusAtIndex(docs, idx, status, reasonText);
            const updated = await adminUpdateNannyProfile(nanny.id, {
                documents: nextDocs,
            });

            if (!updated) {
                reportError('Не удалось сохранить статус документа на сервере.');
                return null;
            }

            onDataChanged();
            reportSuccess(
                status === 'verified'
                    ? 'Документ подтверждён.'
                    : 'Документ отклонён с комментарием.'
            );
            return updated;
        },
        [onDataChanged, promptForReason, reportError, reportSuccess]
    );

    const bulkVerifyVisible = useCallback(async () => {
        if (filteredNannies.length === 0) return;
        const shouldProceed = await confirmAction({
            message: `Подтвердить профиль у ${filteredNannies.length} анкет?`,
            confirmLabel: 'Подтвердить профили',
        });
        if (!shouldProceed) return;

        logAdminAction('bulk_verify_profiles', { count: filteredNannies.length });
        const results = await Promise.all(
            filteredNannies.map((n) =>
                adminUpdateNannyProfile(n.id, { isVerified: true })
            )
        );

        if (results.some((item) => !item)) {
            reportInfo('Часть профилей не удалось обновить на сервере.');
        }

        onDataChanged();
        reportSuccess('Массовое подтверждение профилей завершено.');
    }, [
        confirmAction,
        filteredNannies,
        logAdminAction,
        onDataChanged,
        reportInfo,
        reportSuccess,
    ]);

    const bulkSetDocsStatusVisible = useCallback(
        async (status: DocumentVerification['status']) => {
            if (filteredNannies.length === 0) return;
            const shouldProceed = await confirmAction({
                message: `Проставить статус '${status}' для документов у видимых анкет?`,
                confirmLabel: 'Применить массово',
            });
            if (!shouldProceed) {
                return;
            }

            logAdminAction('bulk_docs_status', {
                status,
                count: filteredNannies.length,
            });

            await Promise.all(
                filteredNannies.map(async (n) => {
                    const docs = applyDocumentStatusToAll(n.documents || [], status);
                    if (docs.length > 0) {
                        await adminUpdateNannyProfile(n.id, { documents: docs });
                    }
                })
            );

            onDataChanged();
            reportSuccess(`Массовое обновление документов: ${status}.`);
        },
        [
            confirmAction,
            filteredNannies,
            logAdminAction,
            onDataChanged,
            reportSuccess,
        ]
    );

    return {
        toggleVerified,
        updateDocumentStatus,
        bulkVerifyVisible,
        bulkSetDocsStatusVisible,
    };
};
