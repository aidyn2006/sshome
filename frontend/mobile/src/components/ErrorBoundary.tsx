import { Component, type ReactNode } from "react";

type Props = {
  fallback: ReactNode;
  children: ReactNode;
  onError?: (error: Error) => void;
};

type State = {
  hasError: boolean;
};

/**
 * Minimal error boundary. Used to keep a failing subtree (e.g. the WebGL 3D
 * scene when the GL runtime is missing) from crashing the whole app — it shows
 * a fallback instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
