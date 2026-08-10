const styles = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  inactive: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  accepted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  expired: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  removed: "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400",
};

export function Badge({ status }) {
  const style = styles[status] || styles.inactive;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
