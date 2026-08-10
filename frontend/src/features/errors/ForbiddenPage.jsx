import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <p className="font-display text-7xl font-bold text-red-500 animate-pulse">403</p>
      <h1 className="mt-4 text-2xl font-bold text-ink-900 dark:text-slate-100">Access Denied</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        You do not have permission to view this resource or perform this action.
      </p>
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <Link to="/dashboard">
          <Button variant="primary">Go Dashboard</Button>
        </Link>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
