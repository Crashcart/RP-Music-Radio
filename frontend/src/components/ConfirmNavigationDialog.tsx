interface ConfirmNavigationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  targetPageLabel: string;
}

export function ConfirmNavigationDialog({
  isOpen,
  onConfirm,
  onCancel,
  targetPageLabel,
}: ConfirmNavigationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Unsaved Changes</h2>
          <button
            className="modal-close"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p>
            ⚠️ You have unsaved changes. If you leave now, your data will be
            lost.
          </p>
          <p>
            Do you want to discard these changes and go to {targetPageLabel}?
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>
            Keep Working
          </button>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: "var(--status-failed, #f87171)" }}
            onClick={onConfirm}
          >
            Discard & Leave
          </button>
        </div>
      </div>
    </div>
  );
}
