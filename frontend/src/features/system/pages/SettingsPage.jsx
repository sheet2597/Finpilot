import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useUserPreferences, useUpdateUserPreferences } from "../hooks";

export default function SettingsPage() {
    const { data: prefs, isLoading } = useUserPreferences();
  const updatePrefs = useUpdateUserPreferences();
  const { setTheme } = useTheme();

  if (isLoading || !prefs) {
    return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your account preferences. Profile and passwords can be modified on your{" "}
          <Link to="/profile" className="text-accent hover:underline font-medium">
            Profile page
          </Link>.
        </p>
      </div>

      <Card className="p-6 border border-slate-100 dark:border-ink-800 rounded-xl space-y-4">
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">General Preferences</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Language</label>
            <Select
              value={prefs.language}
              onChange={(e) => updatePrefs.mutate({ language: e.target.value })}
              options={[{ value: "en", label: "English" }]}
            />
          </div>
          <div>
            <label className="label">Timezone</label>
            <Select
              value={prefs.timezone}
              onChange={(e) => updatePrefs.mutate({ timezone: e.target.value })}
              options={[
                { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
                { value: "UTC", label: "UTC" },
              ]}
            />
          </div>
          <div>
            <label className="label">Display Currency</label>
            <Select
              value={prefs.display_currency}
              onChange={(e) => updatePrefs.mutate({ display_currency: e.target.value })}
              options={[
                { value: "INR", label: "INR (₹)" },
                { value: "USD", label: "USD ($)" },
              ]}
            />
          </div>
          <div>
            <label className="label">Theme</label>
            <Select
              value={prefs.theme}
              onChange={(e) => {
                const value = e.target.value;
                updatePrefs.mutate({ theme: value });
                if (value !== "system") setTheme(value);
              }}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </div>
          <div>
            <label className="label">Default Landing Page</label>
            <Select
              value={prefs.default_landing_page}
              onChange={(e) => updatePrefs.mutate({ default_landing_page: e.target.value })}
              options={[
                { value: "/dashboard", label: "Dashboard" },
                { value: "/ml-dashboard", label: "ML Models" },
                { value: "/analytics", label: "Analytics" },
                { value: "/tax-center", label: "Tax Center" },
              ]}
            />
          </div>
          <div>
            <label className="label">Default Financial Year</label>
            <Select
              value={prefs.default_financial_year || ""}
              onChange={(e) => updatePrefs.mutate({ default_financial_year: e.target.value || null })}
              options={[{ value: "", label: "Always current FY" }]}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
