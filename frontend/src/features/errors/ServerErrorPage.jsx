import { Button } from "@/components/ui/Button";

export function ServerErrorPage({ onReset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <p className="font-display text-6xl font-semibold text-red-500">500</p>
      <h1 className="mt-2 text-xl font-semibold text-ink-900 dark:text-slate-100">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        An unexpected error occurred. Try reloading the page — if it keeps happening, please contact support.
      </p>
      <Button className="mt-6" onClick={onReset ?? (() => window.location.reload())}>
        Reload
      </Button>
    </div>
  );
}
