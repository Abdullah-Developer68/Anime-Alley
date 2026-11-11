import { useEffect, useId, useRef } from "react";
import PropTypes from "prop-types";
import { Loader2, ShieldAlert, Trash2, X } from "lucide-react";

// Shared shell for every "delete X" dialog: what is being deleted, a typed confirmation, and one red button.
// Each caller keeps its own state and API call; this only renders.
const ConfirmDeleteDialog = ({
  title,
  description,
  preview,
  phrase,
  value,
  onChange,
  error,
  isDeleting,
  blockedReason,
  confirmLabel,
  onCancel,
  onConfirm,
}) => {
  const inputRef = useRef(null);
  const titleId = useId();
  const inputId = useId();
  const canConfirm = !blockedReason && !isDeleting && value === phrase;

  useEffect(() => {
    if (!blockedReason)
      inputRef.current?.focus();
  }, [blockedReason]);

  // Escape cancels like any other dialog, but never mid-request
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !isDeleting && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDeleting, onCancel]);

  const submit = (e) => {
    e.preventDefault();
    if (canConfirm) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <form
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        className="w-full max-w-md rounded-t-2xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 sm:rounded-2xl"
      >
        <div className="flex items-start gap-4 p-5 pb-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">{preview}</div>

          {blockedReason ? (
            <p className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-ink-200">
              <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
              {blockedReason}
            </p>
          ) : (
            <div>
              <label htmlFor={inputId} className="block text-sm text-ink-300">
                Type{" "}
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-semibold text-white select-all">{phrase}</span>{" "}
                to confirm
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isDeleting}
                autoComplete="off"
                spellCheck="false"
                aria-invalid={error ? "true" : "false"}
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white transition-colors placeholder:text-ink-600 hover:border-white/20 focus:border-red-400/60 focus:outline-none disabled:opacity-60"
                placeholder={phrase}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-10 cursor-pointer rounded-lg px-4 text-sm font-medium text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-ink-500"
          >
            {isDeleting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {isDeleting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

ConfirmDeleteDialog.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.node.isRequired,
  preview: PropTypes.node.isRequired,
  phrase: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  isDeleting: PropTypes.bool,
  blockedReason: PropTypes.string,
  confirmLabel: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

// Thumbnail or avatar, a title and up to a few muted detail lines
export const DeletePreview = ({ media, title, details }) => (
  <div className="flex min-w-0 items-center gap-3">
    {media}
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-white">{title}</p>
      {details.filter(Boolean).map((line) => (
        <p key={line} className="truncate text-xs text-ink-400">
          {line}
        </p>
      ))}
    </div>
  </div>
);

DeletePreview.propTypes = {
  media: PropTypes.node,
  title: PropTypes.node.isRequired,
  details: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default ConfirmDeleteDialog;
