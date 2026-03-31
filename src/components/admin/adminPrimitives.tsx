import React from 'react';
import { X } from 'lucide-react';
import { AdminPreviewDoc } from './adminModerationUtils';

type AdminPillTone = 'neutral' | 'warm' | 'success' | 'danger' | 'dark';

const adminPillToneClasses: Record<AdminPillTone, string> = {
    neutral: 'bg-white/70 text-stone-700 border-stone-200/80 hover:bg-white hover:border-amber-200/60',
    warm: 'chip-warm border-amber-200/60 text-stone-800 shadow-sm',
    success: 'bg-green-50 text-green-700 border-green-200/80 hover:bg-green-100',
    danger: 'bg-red-50 text-red-700 border-red-200/80 hover:bg-red-100',
    dark: 'bg-stone-900 text-white border-stone-900 shadow-sm',
};

export const adminPillButtonBase =
    'rounded-full border px-3.5 py-2 text-xs font-semibold transition-all';

export const adminSectionPanel = 'section-shell rounded-[1.5rem] p-4';

export const adminSubsectionPanel = 'section-shell rounded-[1.25rem] p-3';

export const adminModalSurface =
    'surface-panel rounded-[2rem] shadow-2xl overflow-hidden';

export const adminModalHeader =
    'hero-shell p-4 sm:p-5 flex items-start justify-between gap-4';

interface AdminPillButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    tone?: AdminPillTone;
}

export const AdminPillButton: React.FC<AdminPillButtonProps> = ({
    active = false,
    tone = 'neutral',
    className = '',
    children,
    ...props
}) => {
    const toneClass = active ? adminPillToneClasses.warm : adminPillToneClasses[tone];

    return (
        <button
            className={`${adminPillButtonBase} ${toneClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

interface AdminDocumentPreviewModalProps {
    previewDoc: AdminPreviewDoc | null;
    onClose: () => void;
}

export const AdminDocumentPreviewModal: React.FC<AdminDocumentPreviewModalProps> = ({
    previewDoc,
    onClose,
}) => {
    if (!previewDoc) return null;

    return (
        <div className="fixed inset-0 z-80 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${adminModalSurface} w-full max-w-5xl h-[85vh] flex flex-col`}>
                <div className="hero-shell p-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-stone-800 truncate pr-4">
                        {previewDoc.name || 'Документ'}
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={previewDoc.url}
                            download={previewDoc.name || 'document'}
                            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-all hover:border-amber-200/60"
                        >
                            Скачать
                        </a>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100">
                            <X size={16} />
                        </button>
                    </div>
                </div>
                {String(previewDoc.url).startsWith('data:image/') ? (
                    <div className="flex-1 overflow-auto bg-stone-50 p-4">
                        <img
                            src={previewDoc.url}
                            alt={previewDoc.name || 'preview'}
                            className="max-w-full mx-auto rounded border border-stone-200"
                        />
                    </div>
                ) : (
                    <iframe title="document-preview" src={previewDoc.url} className="flex-1 w-full" />
                )}
            </div>
        </div>
    );
};
