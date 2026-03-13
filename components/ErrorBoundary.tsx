'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4 p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] max-w-md">
            <AlertTriangle size={32} className="mx-auto text-amber-400" />
            <h3 className="text-lg font-semibold text-white">
              {this.props.fallbackMessage || 'Une erreur est survenue'}
            </h3>
            <p className="text-sm text-neutral-400">
              {this.state.error?.message || 'Erreur inattendue dans ce composant'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors text-sm"
            >
              <RefreshCw size={14} />
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
