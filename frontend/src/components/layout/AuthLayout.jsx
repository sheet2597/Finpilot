import { CheckCircle2 } from "lucide-react";

// Shared shell for all auth screens: brand panel on the left, form on the right.
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-[#111827] transition-colors duration-300">
      <div className="relative hidden w-[42%] flex-col border-r border-slate-800 bg-[#0F172A] p-12 text-white lg:flex overflow-hidden">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-accent/20 blur-[100px]" />
        
        <div className="relative mb-24 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-sm font-bold shadow-sm">FP</div>
          <span className="font-display text-base font-semibold tracking-wide">FinPilot</span>
        </div>

        <div className="relative">
          <h2 className="font-display text-5xl font-bold leading-tight text-white">
            Smart Accounting<br />
            Made Simple
          </h2>
          <p className="mt-8 max-w-[400px] text-lg leading-8 text-slate-400">
            Manage accounting, tax, documents,<br />
            and analytics from one secure workspace.
          </p>
          
          <div className="mt-16 space-y-6 text-base text-slate-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-500" />
              <span>AI Powered</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-500" />
              <span>GST & TDS Ready</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-500" />
              <span>Multi Company</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-500" />
              <span>Bank-grade Security</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-sm font-bold text-white">FP</div>
              <span className="font-display text-base font-semibold text-ink-900 dark:text-white transition-colors duration-300">FinPilot</span>
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white transition-colors duration-300">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
