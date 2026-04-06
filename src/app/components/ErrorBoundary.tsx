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
        <div className="flex items-center justify-center h-full w-full bg-[#D4D0C8] p-8">
          <div className="win95-window max-w-md">
            <div className="win95-titlebar">
              <span>System Error</span>
            </div>
            <div className="p-4 bg-[#D4D0C8] flex gap-3 items-start">
              <span className="text-3xl leading-none">⛔</span>
              <div className="space-y-3">
                <div className="text-[11px] font-bold">
                  A fatal error has occurred in the simulation kernel.
                </div>
                <div className="win95-inset p-2 bg-white font-mono text-[10px] text-[#FF0000]">
                  {this.state.error?.message}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="win95-btn text-[11px]"
                >
                  Restart Simulation
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
