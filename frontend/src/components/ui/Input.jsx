import { forwardRef, useId } from "react";

export const Input = forwardRef(
  ({ label, error, hint, id, endIcon, className = "", ...props }, ref) => {
    const defaultId = `input-${useId()}`;
    const inputId = id || defaultId;
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={props.name || inputId}
            className={`input-base ${error ? "input-error" : ""} ${endIcon ? "pr-10" : ""} ${className}`}
            {...props}
          />
          {endIcon && (
            <div className="absolute inset-y-0 right-3 flex items-center justify-center text-slate-400">
              {endIcon}
            </div>
          )}
        </div>
        {error ? <p className="field-error">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-400">{hint}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";
