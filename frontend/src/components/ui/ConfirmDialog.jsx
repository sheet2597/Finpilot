import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", destructive, isLoading, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onConfirm}
          isLoading={isLoading}
          className={destructive ? "!bg-red-600 hover:!bg-red-700" : ""}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
