import React, { useState } from 'react';

export default function NumberField({ label, value, min, max, integer, onChange }) {
  const [draft, setDraft] = useState(null);
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        min={min}
        max={max}
        step={integer ? 1 : 0.1}
        value={draft ?? String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw === '') return;
          const n = Number(raw);
          if (Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n))) {
            onChange(n);
            setDraft(null);
          }
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}
