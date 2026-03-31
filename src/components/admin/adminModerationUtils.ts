import { DocumentVerification } from '@/core/types';

export interface AdminPreviewDoc {
    url: string;
    name?: string;
}

export const getNowTs = () => Date.now();

export const getDocumentStatusAdminNote = (
    status: DocumentVerification['status'],
    reasonText?: string
) => {
    if (status === 'verified') return 'Статус подтверждён администратором';
    if (status === 'rejected') {
        return reasonText
            ? `Отклонено администратором: ${reasonText}`
            : 'Отклонено администратором';
    }

    return 'Ожидает ручной проверки';
};

export const applyDocumentStatusAtIndex = (
    documents: DocumentVerification[],
    idx: number,
    status: DocumentVerification['status'],
    reasonText?: string
) => {
    if (!documents[idx]) return documents;

    const next = [...documents];
    next[idx] = {
        ...next[idx],
        status,
        aiNotes: getDocumentStatusAdminNote(status, reasonText),
        verifiedAt: getNowTs(),
    };

    return next;
};

export const applyDocumentStatusToAll = (
    documents: DocumentVerification[],
    status: DocumentVerification['status'],
    reasonText?: string
) =>
    documents.map((doc) => ({
        ...doc,
        status,
        aiNotes: getDocumentStatusAdminNote(status, reasonText),
        verifiedAt: getNowTs(),
    }));
