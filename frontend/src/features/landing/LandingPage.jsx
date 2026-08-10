import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { Sun, Moon } from "lucide-react";

// Custom styles for floating cards and animations
const ANIMATION_STYLES = `
@keyframes float-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes float-medium {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-18px); }
}
@keyframes float-fast {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.05); }
}
.animate-float-slow {
  animation: float-slow 6s ease-in-out infinite;
}
.animate-float-medium {
  animation: float-medium 4.5s ease-in-out infinite;
}
.animate-float-fast {
  animation: float-fast 3s ease-in-out infinite;
}
.animate-pulse-glow {
  animation: pulse-glow 8s ease-in-out infinite;
}
.glassmorphism {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.glassmorphism-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
`;

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Stats Counters
  const [usersCount, setUsersCount] = useState(0);
  const [bizCount, setBizCount] = useState(0);
  const [txsCount, setTxsCount] = useState(0);

  // Sync with theme classes
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ata_theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ata_theme", "dark");
      setIsDarkMode(true);
    }
  };

  // Run stats counter animation on mount
  useEffect(() => {
    let start = 0;
    const endUsers = 1250;
    const endBiz = 240;
    const endTxs = 52000;
    const duration = 2000;
    const stepTime = 30;
    const steps = duration / stepTime;

    const timer = setInterval(() => {
      start += 1;
      const progress = start / steps;
      setUsersCount(Math.min(Math.floor(endUsers * progress), endUsers));
      setBizCount(Math.min(Math.floor(endBiz * progress), endBiz));
      setTxsCount(Math.min(Math.floor(endTxs * progress), endTxs));

      if (start >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      title: "Automatic Categorization",
      desc: "Our ML categorization engines process transactions and assign optimal tax buckets automatically.",
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      title: "Duplicate Detection",
      desc: "Identify redundant invoices, transfers, or expenses instantly to keep your ledgers error-free.",
      icon: (
        <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m-6 5h6" />
        </svg>
      )
    },
    {
      title: "Bank Statement Import",
      desc: "Import raw statements (PDF, CSV, Excel) and watch AI extract descriptions, timestamps, and amounts.",
      icon: (
        <svg className="w-6 h-6 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Tax Estimation Engine",
      desc: "Live projections of GST, TDS, and personal income tax options based on real-time earnings.",
      icon: (
        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Secure JWT & RBAC",
      desc: "Strict enterprise access control. Restrict company workspaces to specific client mappings securely.",
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      title: "Premium Reporting",
      desc: "Generate professional Profit & Loss statements, Cash Flow breakdowns, and one-click PDF/Excel exports.",
      icon: (
        <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  const steps = [
    { title: "Create Account", desc: "Sign up securely in 30 seconds and verify your profile via OTP." },
    { title: "Setup Workspace", desc: "Create your first company profile with financial settings." },
    { title: "Upload Data", desc: "Drag & drop your invoices, ledger statements, or bank extracts." },
    { title: "AI Categorizes", desc: "Our models parse the records, detect duplicates, and extract details." },
    { title: "View Reports", desc: "Access clean GST sheets, cash flow models, and expert insights." }
  ];

  const roles = [
    { name: "Individual", sub: "Salaried & Personal Use", desc: "Manage a single personal workspace with automated tax estimation and smart category classification." },
    { name: "Freelancer", sub: "Contractors & Creators", desc: "Handle multiple companies, log custom business receipts, track tax deductions, and export GST summaries." },
    { name: "Business Owner", sub: "SMBs & Startups", desc: "Manage employee groups, track active vendors and customer invoices, and securely share workspace access." },
    { name: "Accountant", sub: "In-House Bookkeepers", desc: "Invite multiple clients, upload statements on their behalf, and maintain audit records for connected entities." },
    { name: "Chartered Accountant", sub: "Firms & Advisors", desc: "Get practice dashboards, configure shared company assignments, and file verified reports." },
    { name: "Admin", sub: "System Controllers", desc: "Global access to user roles and system configuration via the Django admin panel." }
  ];

  const faqs = [
    { q: "How does expense categorization work?", a: "When you upload statements, our ML pipelines tokenize transaction narratives and map them to predefined categories using classification models. Results include confidence scores and plain-English explanations." },
    { q: "Can I manage multiple companies?", a: "Yes. Freelancers, Business Owners, and Accountant/CA roles can manage unlimited company profiles and switch between them dynamically from the topbar workspace selector. Individuals are limited to a single company." },
    { q: "Is my financial data secure?", a: "Security is our highest priority. We use strict JWT tokens, cryptographic password hashing, role-based database mapping (tenant isolation), and detailed dual-database audit logging." },
    { q: "Can my accountant access my data?", a: "Absolutely. CAs or Accountants can invite you to link your account. Once you accept, they can view only the specific companies you share with them. You can revoke access at any moment." },
    { q: "What file formats are supported for imports?", a: "We support CSV, Excel (XLSX, XLS), and standard PDF bank statement structures. Our import system features automatic column mapping and duplicate transaction checks." },
    { q: "How is the Tax Estimation calculated?", a: "FinPilot analyzes current business income, expenses, and GST outputs to calculate real-time tax liabilities for both old and new regime options." },
    { q: "Can I undo or rollback an import?", a: "Bulk imports run synchronously and return per-row success and error details. You can bulk-delete imported transactions from the Transactions page if needed." },
    { q: "How do I switch between dark and light mode?", a: "You can toggle the theme using the sun/moon button in the topbar navbar, or within your account settings page." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      <style>{ANIMATION_STYLES}</style>

      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-[100px] -z-10 animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-400/10 dark:bg-teal-600/10 rounded-full blur-[120px] -z-10 animate-pulse-glow" />

      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 glassmorphism-light dark:bg-slate-950/90 dark:backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-accent-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold tracking-wider">
              FP
            </div>
            <span className="font-display font-semibold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              FinPilot
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:-translate-y-0.5">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:-translate-y-0.5">How It Works</a>
            <a href="#roles" className="hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:-translate-y-0.5">Roles</a>
            <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:-translate-y-0.5">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-lg p-2 text-slate-500 hover:bg-surface-muted dark:text-slate-300 dark:hover:bg-ink-800"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/10">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/10">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="space-y-6 max-w-3xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.1]">
            Manage Your Business Finance <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 to-teal-400 bg-clip-text text-transparent">
              Smarter with AI
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-[650px] mx-auto leading-relaxed">
            Upload invoices, bank statements, and financial documents to automatically organize transactions, estimate taxes, and generate powerful reports using AI.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/register" className="px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl shadow-xl shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 hover:scale-[1.02]">
              Get Started Free
            </Link>
            <a href="#features" className="px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-white border border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all transform hover:-translate-y-0.5 hover:scale-[1.02]">
              Learn More
            </a>
          </div>
        </div>

        {/* Hero Interactive Dashboard Mockup */}
        <div className="mt-10 relative mx-auto max-w-5xl rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-4 sm:p-6 shadow-xl backdrop-blur-md">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />

          {/* Top Bar window layout */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
              app.finpilot.com/dashboard
            </div>
            <div className="w-12" />
          </div>

          {/* Inner Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 text-left">
            <div className="lg:col-span-2 space-y-6">
              {/* Financial Progress Chart Mockup */}
              <div className="p-5 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Income</span>
                    <p className="text-xl font-bold font-mono dark:text-white">₹4,52,000</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Expenses</span>
                    <p className="text-xl font-bold font-mono text-slate-500 dark:text-slate-400">₹2,18,000</p>
                  </div>
                </div>
                {/* Custom SVG line graph */}
                <div className="h-40 w-full flex items-end">
                  <svg className="w-full h-full text-blue-500" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    <path d="M0,25 Q15,10 30,22 T60,5 T90,12 T100,2 L100,30 L0,30 Z" fill="url(#chartGrad)" />
                    <path d="M0,25 Q15,10 30,22 T60,5 T90,12 T100,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>APR</span>
                  <span>MAY</span>
                  <span>JUN</span>
                  <span>JUL</span>
                </div>
              </div>

              {/* Recent transaction rows */}
              <div className="p-5 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl space-y-3">
                <span className="text-sm font-semibold block text-slate-700 dark:text-slate-300">Recent Transactions (12)</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs border border-slate-100 dark:border-slate-700/50">
                    <span className="font-medium dark:text-white">Stripe Payment Recv</span>
                    <span className="text-slate-400">Sales</span>
                    <span className="font-mono text-emerald-500 font-semibold">+₹45,000.00</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs border border-slate-100 dark:border-slate-700/50">
                    <span className="font-medium dark:text-white">AWS Cloud Server Fee</span>
                    <span className="text-slate-400">Hosting</span>
                    <span className="font-mono text-red-500 font-semibold">-₹12,450.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Floating Cards */}
            <div className="space-y-6">
              {/* Compliance score circle dial */}
              <div className="p-5 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between gap-4 animate-float-slow">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Budget Used</span>
                  <p className="text-2xl font-bold font-mono dark:text-white">72%</p>
                  <span className="text-[11px] text-slate-400">3 Active Companies</span>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-teal-400" strokeDasharray="72, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
              </div>

              {/* AI Insights Card */}
              <div className="p-5 border border-slate-100 dark:border-slate-700 bg-gradient-to-tr from-blue-600 to-accent-500 text-white rounded-xl space-y-3 shadow-lg shadow-blue-500/20 animate-float-medium">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">✨</div>
                  <span className="text-xs font-semibold uppercase tracking-wider">AI Forecast</span>
                </div>
                <p className="text-xs text-blue-50 leading-relaxed">
                  "Based on Q2 expenses, you can claim an additional ₹32,000 under Section 37(1) business expenditure offsets."
                </p>
              </div>

              {/* GST summary card */}
              <div className="p-5 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl space-y-2 animate-float-fast">
                <span className="text-xs text-slate-400 block uppercase font-semibold">GST Liability</span>
                <p className="text-xl font-bold font-mono text-accent-500">₹18,450</p>
                <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-accent-500 h-full w-[70%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By / Tickers */}
      <section className="border-t border-b border-slate-200/50 dark:border-slate-700/50 bg-white/30 dark:bg-slate-900/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="text-slate-400 font-semibold tracking-wider uppercase text-xs">
            Trusted by modern businesses worldwide
          </div>
          <div className="flex flex-wrap justify-center items-center gap-12 text-2xl font-display font-semibold text-slate-400 dark:text-slate-600">
            <div className="flex items-center gap-6">
              <span>{usersCount}+ <span className="text-xs font-sans block text-slate-400 mt-1 uppercase tracking-wider font-semibold">Active Users</span></span>
            </div>
            <div className="flex items-center gap-6">
              <span>{bizCount}+ <span className="text-xs font-sans block text-slate-400 mt-1 uppercase tracking-wider font-semibold">Companies</span></span>
            </div>
            <div className="flex items-center gap-6">
              <span>{(txsCount / 1000).toFixed(0)}k+ <span className="text-xs font-sans block text-slate-400 mt-1 uppercase tracking-wider font-semibold">Tx Processed</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Financial tools built for modern teams
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Everything you need to automate tax preparations, monitor cash movements, and ensure compliance without spreadsheet exhaustion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl dark:hover:shadow-blue-500/5 transition-all transform hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-950 dark:text-white mb-2">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            How it works in 5 simple steps
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Get up and running with enterprise tax tracking without any complex configurations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative">
          {/* Connector Line */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 -z-10" />

          {steps.map((st, idx) => (
            <div
              key={idx}
              className="relative p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm cursor-pointer hover:border-blue-500 transition-all hover:scale-[1.02]"
              onClick={() => setActiveStep(idx)}
            >
              {/* Number Badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono mb-4 transition-colors ${activeStep === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                {idx + 1}
              </div>
              <h3 className="font-display font-semibold text-sm mb-2">{st.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Designed for every operational role
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            AI Tax Assistant dynamically structures your dashboards, sidebar links, actions, and limits according to your business role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roles.map((r, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-all hover:scale-[1.02] flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider font-mono">
                  {r.sub}
                </span>
                <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white mt-1 mb-3">
                  {r.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {r.desc}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-400">Included capabilities</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reports Showcase Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Tax & Financial Reports in One-Click
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate clean, compliant reports without manual data aggregation. All generated files are scoped securely to active company sessions with full download support.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl space-y-2">
              <span className="text-sm font-semibold dark:text-white">Profit & Loss</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live operational income vs cost metrics.</p>
            </div>
            <div className="p-4 border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl space-y-2">
              <span className="text-sm font-semibold dark:text-white">GST returns</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reconciled GSTR-1 & GSTR-2B summaries.</p>
            </div>
            <div className="p-4 border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl space-y-2">
              <span className="text-sm font-semibold dark:text-white">Cash Flow</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Direct cash movement tracking logs.</p>
            </div>
            <div className="p-4 border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl space-y-2">
              <span className="text-sm font-semibold dark:text-white">PDF/Excel Export</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant offline downloads for filing.</p>
            </div>
          </div>
        </div>

        {/* Custom Visual Illustrating Reports */}
        <div className="p-6 border border-slate-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-400">Report Center</span>
            <span className="text-xs text-blue-500 font-medium">Export all</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">P&L</div>
                <div>
                  <span className="text-xs font-semibold block">Profit & Loss Summary</span>
                  <span className="text-[11px] text-slate-400">FY 2025-26</span>
                </div>
              </div>
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">Download</button>
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 text-accent-500 flex items-center justify-center font-bold text-xs">GST</div>
                <div>
                  <span className="text-xs font-semibold block">GST Reconciliation Sheet</span>
                  <span className="text-[11px] text-slate-400">GSTR-2B matching</span>
                </div>
              </div>
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">Download</button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Loved by tax professionals & business owners
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Read stories from individuals and accountants who switched to automated bookkeeping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/50 dark:bg-slate-800 flex flex-col justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "The automatic company switcher is exceptionally quick. I switch between client workspaces and categorize expenses in seconds. Saved us hours during filing."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm">SP</div>
              <div>
                <span className="text-xs font-bold block">Siddharth Patel</span>
                <span className="text-[11px] text-slate-400">Chartered Accountant</span>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/50 dark:bg-slate-800 flex flex-col justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "I run multiple online stores. Uploading customer CSV receipts and matching them against invoices was a nightmare. FinPilot's duplicates detector flags entries instantly."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm">AR</div>
              <div>
                <span className="text-xs font-bold block">Ananya Rao</span>
                <span className="text-[11px] text-slate-400">Business Owner</span>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/50 dark:bg-slate-800 flex flex-col justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "As a freelance developer, tax planning felt complex. Being able to run forecasts and estimate regimes directly from my statements keeps my overhead completely optimized."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm">DK</div>
              <div>
                <span className="text-xs font-bold block">Devendra K.</span>
                <span className="text-[11px] text-slate-400">Freelance Engineer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about connections, roles, and AI tax processing limits.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden transition-all hover:dark:bg-slate-700 focus-within:ring-2 focus-within:ring-blue-500"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm transition-colors hover:text-blue-600 dark:hover:text-blue-400 dark:text-white"
              >
                <span>{faq.q}</span>
                <svg className={`w-5 h-5 text-slate-500 dark:text-slate-300 transform transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedFaq === idx && (
                <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 bg-gradient-to-tr from-blue-600 to-accent-500 text-white rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight max-w-xl mx-auto">
            Ready to simplify your business finances?
          </h2>
          <p className="text-blue-100 max-w-md mx-auto text-sm">
            Sign up for your free workspace, invite your accountant, and leverage automated expense mapping instantly.
          </p>
          <div className="pt-4">
            <Link to="/register" className="px-8 py-4 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-50 rounded-xl transition-all shadow-xl transform hover:-translate-y-1 hover:scale-[1.02] inline-block">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 leading-loose">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                FP
              </div>
              <span className="font-display font-semibold text-slate-950 dark:text-white">FinPilot</span>
            </div>
            <p className="max-w-xs">
              AI-driven tax preparation, statement categorizations, and role-scoped workspace controls.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-slate-900 dark:hover:text-white">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white">How it Works</a></li>
              <li><Link to="/login" className="hover:text-slate-900 dark:hover:text-white">Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Security</h4>
            <ul className="space-y-2">
              <li><span className="text-slate-400">Strict JWT Isolation</span></li>
              <li><span className="text-slate-400">RBAC Controls</span></li>
              <li><span className="text-slate-400">Auditable Log Trail</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Contact</h4>
            <p className="max-w-xs">
              Email: support@finpilot.com<br />
              Location: Mumbai, India
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FinPilot Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
