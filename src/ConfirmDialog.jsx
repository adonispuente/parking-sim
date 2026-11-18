import React, { useEffect, useRef } from 'react';

/**
 * Modal confirmation built on the native <dialog>: showModal() gives us the
 * focus trap, Escape-to-cancel, inert background and focus restoration for free.
 */
export default function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    return () => dialog?.open && dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // A click on the ::backdrop lands on the <dialog> element itself.
        if (event.target === ref.current) onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-description">{description}</p>
      <div className="modal-actions">
        <button className="button secondary" autoFocus onClick={onCancel}>
          Cancel
        </button>
        <button className="button danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
