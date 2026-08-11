"use client";

import { useId } from "react";

interface FieldProps {
  autoComplete?: string;
  error?: string;
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}

export function Field({
  autoComplete,
  error,
  hint,
  label,
  onChange,
  type = "text",
  value,
}: FieldProps) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="font-display text-sm font-medium">
        {label}
      </label>
      <input
        id={fieldId}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className="field"
      />
      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-crit">
          {error}
        </p>
      ) : null}
    </div>
  );
}
