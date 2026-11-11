import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { inputClass, labelClass } from "../../ui/styles";

// Destructive action behind a typed confirmation: the button unlocks once `confirmWord` is typed
const ConfirmDialog = ({ open, onClose, title, description, confirmWord, confirmLabel, onConfirm, children }) => {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (busy)
      return;
    setTyped("");
    setError("");
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setTyped("");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      busy={busy}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy || typed !== confirmWord}>
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      <p className="mt-4 flex gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        This can&apos;t be undone.
      </p>
      <label htmlFor="confirm-word" className={`${labelClass} mt-4`}>
        Type <span className="font-mono text-ink">{confirmWord}</span> to confirm
      </label>
      <input id="confirm-word" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputClass} />
      {error && <p role="alert" className="mt-2 text-[13px] text-danger">{error}</p>}
    </Modal>
  );
};

export default ConfirmDialog;
