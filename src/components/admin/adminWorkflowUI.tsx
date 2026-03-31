import React from 'react';

import { Button } from '../UI';
import { adminModalSurface } from './adminPrimitives';

type AdminToastTone = 'info' | 'success' | 'error';

interface AdminToast {
    id: number;
    message: string;
    tone: AdminToastTone;
}

interface ConfirmState {
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    resolve: (value: boolean) => void;
}

interface PromptState {
    promptText: string;
    defaultValue: string;
    minLength: number;
    invalidMessage: string;
    confirmLabel?: string;
    cancelLabel?: string;
    resolve: (value: string | null) => void;
}

interface AdminWorkflowUIContextValue {
    confirmAction: (params: {
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
    }) => Promise<boolean>;
    promptForReason: (params: {
        promptText: string;
        defaultValue: string;
        minLength?: number;
        invalidMessage: string;
        confirmLabel?: string;
        cancelLabel?: string;
    }) => Promise<string | null>;
    reportError: (message: string) => void;
    reportInfo: (message: string) => void;
    reportSuccess: (message: string) => void;
}

export interface AdminWorkflowEvent {
    kind: AdminToastTone;
    message: string;
    at: number;
}

const AdminWorkflowUIContext = React.createContext<AdminWorkflowUIContextValue | null>(
    null
);

export const useAdminWorkflowUI = () => {
    const context = React.useContext(AdminWorkflowUIContext);
    if (!context) {
        throw new Error('useAdminWorkflowUI must be used within AdminWorkflowUIProvider');
    }
    return context;
};

export const AdminWorkflowUIProvider: React.FC<{
    children: React.ReactNode;
    onWorkflowEvent?: (event: AdminWorkflowEvent) => void;
}> = ({
    children,
    onWorkflowEvent,
}) => {
    const [toasts, setToasts] = React.useState<AdminToast[]>([]);
    const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(null);
    const [promptState, setPromptState] = React.useState<PromptState | null>(null);
    const [promptValue, setPromptValue] = React.useState('');
    const [promptError, setPromptError] = React.useState<string | null>(null);

    const dismissToast = React.useCallback((id: number) => {
        setToasts((current) => current.filter((item) => item.id !== id));
    }, []);

    const pushToast = React.useCallback(
        (message: string, tone: AdminToastTone) => {
            const event = { kind: tone, message, at: Date.now() };
            const id = Date.now() + Math.floor(Math.random() * 1000);
            setToasts((current) => [...current, { id, message, tone }]);
            onWorkflowEvent?.(event);
            window.setTimeout(() => dismissToast(id), 3200);
        },
        [dismissToast, onWorkflowEvent]
    );

    const confirmAction = React.useCallback(
        ({
            message,
            confirmLabel,
            cancelLabel,
        }: {
            message: string;
            confirmLabel?: string;
            cancelLabel?: string;
        }) =>
            new Promise<boolean>((resolve) => {
                setConfirmState({ message, confirmLabel, cancelLabel, resolve });
            }),
        []
    );

    const promptForReason = React.useCallback(
        ({
            promptText,
            defaultValue,
            minLength = 8,
            invalidMessage,
            confirmLabel,
            cancelLabel,
        }: {
            promptText: string;
            defaultValue: string;
            minLength?: number;
            invalidMessage: string;
            confirmLabel?: string;
            cancelLabel?: string;
        }) =>
            new Promise<string | null>((resolve) => {
                setPromptValue(defaultValue);
                setPromptError(null);
                setPromptState({
                    promptText,
                    defaultValue,
                    minLength,
                    invalidMessage,
                    confirmLabel,
                    cancelLabel,
                    resolve,
                });
            }),
        []
    );

    const contextValue = React.useMemo<AdminWorkflowUIContextValue>(
        () => ({
            confirmAction,
            promptForReason,
            reportError: (message) => pushToast(message, 'error'),
            reportInfo: (message) => pushToast(message, 'info'),
            reportSuccess: (message) => pushToast(message, 'success'),
        }),
        [confirmAction, promptForReason, pushToast]
    );

    return (
        <AdminWorkflowUIContext.Provider value={contextValue}>
            {children}

            <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto rounded-[1.25rem] border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
                            toast.tone === 'error'
                                ? 'border-red-200 bg-red-50/95 text-red-700'
                                : toast.tone === 'success'
                                  ? 'border-green-200 bg-green-50/95 text-green-700'
                                  : 'border-stone-200 bg-white/95 text-stone-700'
                        }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

            {confirmState && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-stone-900/55 p-4 backdrop-blur-sm">
                    <div className={`${adminModalSurface} w-full max-w-md p-5`}>
                        <div className="eyebrow mb-3">Подтверждение</div>
                        <p className="text-sm leading-6 text-stone-700">{confirmState.message}</p>
                        <div className="mt-5 flex gap-2">
                            <Button
                                className="w-auto px-5"
                                onClick={() => {
                                    confirmState.resolve(false);
                                    setConfirmState(null);
                                }}
                                variant="outline"
                            >
                                {confirmState.cancelLabel || 'Отмена'}
                            </Button>
                            <Button
                                className="w-auto px-5"
                                onClick={() => {
                                    confirmState.resolve(true);
                                    setConfirmState(null);
                                }}
                                variant="primary"
                            >
                                {confirmState.confirmLabel || 'Подтвердить'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {promptState && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-stone-900/55 p-4 backdrop-blur-sm">
                    <div className={`${adminModalSurface} w-full max-w-lg p-5`}>
                        <div className="eyebrow mb-3">Комментарий модератора</div>
                        <p className="text-sm leading-6 text-stone-700">{promptState.promptText}</p>
                        <textarea
                            autoFocus
                            className="input-glass mt-4 min-h-[140px] w-full resize-none px-4 py-3 text-sm text-stone-800"
                            onChange={(event) => {
                                setPromptValue(event.target.value);
                                if (promptError) setPromptError(null);
                            }}
                            value={promptValue}
                        />
                        <div className="mt-2 text-xs text-stone-500">
                            Минимум {promptState.minLength} символов.
                        </div>
                        {promptError && (
                            <div className="mt-2 text-xs font-medium text-red-600">
                                {promptError}
                            </div>
                        )}
                        <div className="mt-5 flex gap-2">
                            <Button
                                className="w-auto px-5"
                                onClick={() => {
                                    promptState.resolve(null);
                                    setPromptState(null);
                                    setPromptError(null);
                                }}
                                variant="outline"
                            >
                                {promptState.cancelLabel || 'Отмена'}
                            </Button>
                            <Button
                                className="w-auto px-5"
                                onClick={() => {
                                    const trimmed = promptValue.trim();
                                    if (trimmed.length < promptState.minLength) {
                                        setPromptError(promptState.invalidMessage);
                                        return;
                                    }
                                    promptState.resolve(trimmed);
                                    setPromptState(null);
                                    setPromptError(null);
                                }}
                                variant="primary"
                            >
                                {promptState.confirmLabel || 'Сохранить'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminWorkflowUIContext.Provider>
    );
};
