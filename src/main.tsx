import React from 'react';
import { createRoot } from 'react-dom/client';
import AmanahApp from './App';
import './index.css';

type ErrorBoundaryState = { hasError: boolean; message: string };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AMANAH application render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <section className="max-w-xl w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">AMANAH could not display this page</h1>
            <p className="mt-2 text-sm text-slate-600">
              The application encountered an unexpected error. Your account and database records have not been changed by this display error.
            </p>
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Reload website
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root was not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AmanahApp />
    </AppErrorBoundary>
  </React.StrictMode>,
);
