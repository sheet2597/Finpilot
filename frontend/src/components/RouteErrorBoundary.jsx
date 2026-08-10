import { Component } from "react";
import { Button } from "@/components/ui/Button";

export class RouteErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Route Error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
          <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink-900 dark:text-slate-100">Failed to load content</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <Button className="mt-6" onClick={this.handleReset} variant="secondary">
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
