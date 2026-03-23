import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Readonly<Props>;
  declare state: Readonly<State>;
  declare setState: React.Component<Props, State>['setState'];

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px] gap-4 animate-fade-in">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={28} className="text-amber-500" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-stone-800 mb-1">
            Что-то пошло не так
          </h3>
          <p className="text-sm text-stone-500 max-w-xs leading-relaxed">
            {this.props.fallbackMessage || 'Мы уже знаем об этом и работаем над исправлением. Попробуйте обновить страницу.'}
          </p>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-700 transition-all active:scale-95 shadow-md"
          >
            <RefreshCw size={14} />
            Попробовать снова
          </button>

          <a
            href="mailto:help@blizko.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition-all active:scale-95"
          >
            <MessageCircle size={14} />
            Написать нам
          </a>
        </div>
      </div>
    );
  }
}
