import { forwardRef, useId } from "react";

export const Select = forwardRef(
  ({ label, error, options, placeholder, id, className = "", ...props }, ref) => {
    const defaultId = `select-${useId()}`;
    const selectId = id || defaultId;
    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="label">
            {label}
          </label>
        )}
        <select ref={ref} id={selectId} name={props.name || selectId} className={`input-base ${error ? "input-error" : ""} ${className}`} {...props}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
