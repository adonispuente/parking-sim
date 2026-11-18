import React from 'react';

/**
 * One collapsible group in the operations panel. `defaultOpen` is read once on
 * mount; afterwards the browser owns the open state so the user's choice sticks.
 */
export default function PanelSection({ title, meta, defaultOpen = false, children, ...rest }) {
  return (
    <details className="panel-section" open={defaultOpen} {...rest}>
      <summary>
        <h2>{title}</h2>
        {meta != null && <span className="panel-meta">{meta}</span>}
        <svg className="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      </summary>
      <div className="panel-body">{children}</div>
    </details>
  );
}
