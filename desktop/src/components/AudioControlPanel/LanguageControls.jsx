import { LANGUAGES } from "../../languages";

export function LanguagePills({ selected, onChange, disabled }) {
  const toggle = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="chips acp-pills">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`chip ${selected.includes(l.code) ? "chip-active" : ""}`}
          disabled={disabled}
          onClick={() => toggle(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// renders a dropdown menu for selecting a single target translation language
export function LanguageDropdown({ value, onChange, disabled }) {
  return (
    <select
      className="select acp-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">(None - Original)</option>
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
