import React, { useId, useState } from 'react';

/**
 * Numeric input that keeps the user's in-progress text (e.g. "1." or "") and
 * only commits values inside [min, max]. Out-of-range text shows an inline error.
 */
export default function NumberField({ label, value, min, max, integer, onChange }) {
  const [draft, setDraft] = useState(null);
  const errorId = useId();
  const n = draft === null ? value : Number(draft);
  const invalid =
    draft !== null &&
    draft !== '' &&
    !(Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n)));
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        autoComplete="off"
        min={min}
        max={max}
        step={integer ? 1 : 0.1}
        value={draft ?? String(integer ? value : Math.round(value * 100) / 100)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw === '') return;
          const next = Number(raw);
          if (
            Number.isFinite(next) &&
            next >= min &&
            next <= max &&
            (!integer || Number.isInteger(next))
          ) {
            onChange(next);
            setDraft(null);
          }
        }}
        onBlur={() => setDraft(null)}
      />
      {invalid && (
        <span className="field-error" id={errorId}>
          Enter {integer ? 'a whole number' : 'a number'} from {min} to {max}.
        </span>
      )}
    </label>
  );
}
