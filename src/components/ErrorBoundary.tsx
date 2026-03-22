/**
 * React error boundary — catches render errors in the component tree
 * and displays a parchment-styled fallback UI.
 *
 * React 19 still requires class components for error boundaries.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';

interface ErrorFallbackProps {
  error: Error | null;
  stack: string;
  onReset: () => void;
}

function ErrorFallback({ error, stack, onReset }: ErrorFallbackProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(26, 18, 12, 0.95)' }}
      data-testid="error-boundary-fallback"
    >
      <div
        className="max-w-lg w-full mx-4 rounded-xl p-8 shadow-2xl"
        style={{
          background: '#fdf6e3',
          border: '3px solid #8b5a2b',
        }}
      >
        {/* Title */}
        <h1
          className="text-3xl mb-2 text-center"
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            color: '#8b5a2b',
          }}
        >
          Something went wrong
        </h1>

        <div
          className="h-px w-full my-4"
          style={{ background: 'linear-gradient(to right, transparent, #8b5a2b, transparent)' }}
        />

        {/* Error message */}
        {error && (
          <p
            className="text-sm mb-4"
            style={{
              fontFamily: 'Georgia, serif',
              color: '#5a3e2b',
              lineHeight: '1.6',
            }}
          >
            {error.message}
          </p>
        )}

        {/* Collapsible stack trace */}
        {stack && (
          <details className="mb-6">
            <summary
              className="text-xs cursor-pointer select-none mb-2"
              style={{
                fontFamily: 'Georgia, serif',
                color: '#8b5a2b',
              }}
            >
              Stack trace
            </summary>
            <pre
              className="text-xs overflow-auto max-h-48 p-3 rounded-md"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                background: 'rgba(139, 90, 43, 0.08)',
                border: '1px solid rgba(139, 90, 43, 0.2)',
                color: '#5a3e2b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {stack}
            </pre>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 h-11 rounded-lg text-sm transition-all duration-200 cursor-pointer"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#fdf6e3',
              background: '#5a3e2b',
              border: '2px solid #8b5a2b',
              letterSpacing: '0.03em',
            }}
            data-testid="error-boundary-reset"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 h-11 rounded-lg text-sm transition-all duration-200 cursor-pointer"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#5a3e2b',
              background: 'transparent',
              border: '2px solid #8b5a2b',
              letterSpacing: '0.03em',
            }}
          >
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends React.Component<PropsWithChildren, State> {
  state: State = { hasError: false, error: null, errorInfo: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Bok Error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack ?? '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          stack={this.state.errorInfo}
          onReset={() => this.setState({ hasError: false, error: null, errorInfo: '' })}
        />
      );
    }
    return this.props.children;
  }
}
