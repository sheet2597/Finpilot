export function Button({ variant = "primary", isLoading, children, className = "", disabled, ...props }) {
  const base = variant === "primary" ? "btn-primary" : "btn-secondary";
  const spinnerClass =
    variant === "primary"
      ? "h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      : "h-4 w-4 animate-spin rounded-full border-2 border-ink-700/30 border-t-ink-700 dark:border-slate-400/30 dark:border-t-slate-300";
  return (
    <button className={`${base} ${className}`} disabled={disabled || isLoading} {...props}>
      {isLoading && <span className={spinnerClass} />}
      {children}
    </button>
  );
}
