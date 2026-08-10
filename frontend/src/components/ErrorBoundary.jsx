import { Component } from "react";
import { ServerErrorPage } from "@/features/errors/ServerErrorPage";

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Centralized client-side error log. Swap for Sentry/LogRocket etc. later
    // without touching any call site.
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ServerErrorPage onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
