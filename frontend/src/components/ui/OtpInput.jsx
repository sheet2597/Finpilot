import { useRef } from "react";

// A ledger-style OTP row: each digit in its own boxed cell, echoing a tabular numeric input.
export function OtpInput({ value, onChange, length = 6, error }) {
  const inputsRef = useRef([]);
  const digits = value.split("");

  const setDigit = (index, char) => {
    const next = value.split("");
    next[index] = char;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (char && index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
  };

  return (
    <div>
      <div className="flex gap-2" onPaste={handlePaste}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            value={digits[i] || ""}
            onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, "").slice(-1))}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            className={`h-12 w-11 rounded-lg border text-center font-display text-lg font-semibold text-ink-900 outline-none transition-all duration-300
              focus:border-accent focus:ring-2 focus:ring-accent/20
              dark:bg-slate-800 dark:text-white dark:focus:border-accent
              ${error ? "border-red-300 dark:border-red-500" : "border-slate-200 dark:border-slate-600"}`}
          />
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
