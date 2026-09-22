import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui';

interface State {
  error: Error | null;
}

/** Catches render errors so a single broken panel never blanks the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] render error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title={`${this.props.label ?? 'This section'} could not be displayed`}
          message="An unexpected rendering error occurred. Your data is safe — try reloading this section."
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
