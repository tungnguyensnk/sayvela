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
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={fieldId} className="mb-2 block text-sm font-medium text-white/82">
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
        className={`w-full rounded-3xl border bg-white/8 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 ${
          error
            ? "border-rose-300/50 shadow-[0_0_0_1px_rgba(251,113,133,0.35)]"
            : "border-white/12 focus:border-cyan-200/44 focus:bg-white/10"
        }`}
      />
      {hint ? (
        <p id={hintId} className="mt-2 text-sm text-white/46">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
