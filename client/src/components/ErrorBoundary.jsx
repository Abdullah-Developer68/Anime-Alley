import { Component } from "react";
import { RotateCcw } from "lucide-react";
import { buttonClass } from "./ui/styles";

// A crash in one page shows this panel instead of a blank screen
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error)
      return this.props.children;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.02em] text-ink">This page hit an unexpected error.</h1>
        <p className="mt-2 text-sm text-muted">Reloading usually fixes it. Your cart and account are safe.</p>
        <button type="button" onClick={() => window.location.reload()} className={buttonClass({ className: "mt-6" })}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Reload page
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
