import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { ClientSwitcher } from "./ClientSwitcher";
import { CompanySwitcher } from "./CompanySwitcher";
import toast from "react-hot-toast";
import {
  Sun, Moon, Menu, User, Settings, LogOut, Building2, AlertTriangle, ChevronDown, Tag
} from "lucide-react";

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully.");
    navigate("/");
  };

  const initials = (user?.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-100 bg-white px-4 dark:border-ink-800 dark:bg-ink-900 sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="rounded-lg p-2 text-slate-500 hover:bg-surface-muted dark:hover:bg-ink-800 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="hidden sm:block z-[60]">
        <ClientSwitcher />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block z-[60] mr-2">
          <CompanySwitcher />
        </div>
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-lg p-2 text-slate-500 hover:bg-surface-muted dark:text-slate-300 dark:hover:bg-ink-800"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="User menu"
            className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-surface-muted dark:border-ink-700 dark:hover:bg-ink-800"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light text-xs font-semibold text-accent-dark">
              {initials}
            </span>
            <span className="hidden text-sm font-medium text-ink-900 dark:text-slate-100 sm:inline">{user?.full_name}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-100 bg-white py-1 shadow-popover dark:border-ink-800 dark:bg-ink-900 z-50"
            >
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                className="w-full px-4 py-2.5 text-left text-sm text-ink-900 hover:bg-surface-muted dark:text-slate-100 dark:hover:bg-ink-800 flex items-center gap-2.5"
              >
                <User size={15} className="text-slate-400" /> Profile
              </button>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate("/categories"); }}
                className="w-full px-4 py-2.5 text-left text-sm text-ink-900 hover:bg-surface-muted dark:text-slate-100 dark:hover:bg-ink-800 flex items-center gap-2.5"
              >
                <Tag size={15} className="text-slate-400" /> Categories
              </button>

              <div className="border-t border-slate-100 dark:border-ink-800 my-1" />
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
