import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center h-full w-full bg-[#F5F5F5] p-8">
          <div className="border-2 border-black p-6 max-w-md text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2">Simulation Error</h2>
            <p className="text-xs font-mono text-black/60 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-black hover:bg-black hover:text-white transition-colors"
            >
              Restart Simulation
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
