import { LANGUAGES } from "../../languages";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";

const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.code, label: l.label }));

export function LanguageMultiSelect({ selected, onChange, disabled }) {
  return (
    <MultiSelector
      label="Input Languages (Hints)"
      options={LANGUAGE_OPTIONS}
      value={Array.isArray(selected) ? selected : []}
      onChange={onChange}
      placeholder="Select input languages"
      size="sm"
      triggerDisplay="badges"
      maxBadges={2}
      isDisabled={disabled}
      isLabelHidden
    />
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
