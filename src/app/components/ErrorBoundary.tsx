import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center h-full w-full bg-white p-12">
          <div className="max-w-md space-y-4">
            <div className="data-huge">ERR</div>
            <div className="beam-h" />
            <div className="text-[12px] font-bold uppercase leading-relaxed">
              A fatal error has occurred in the simulation kernel.
            </div>
            <div className="border-[3px] border-black p-3 text-[11px] font-bold">
              {this.state.error?.message}
            </div>
            <button onClick={() => window.location.reload()} className="brut-btn text-[11px]">
              Restart
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
