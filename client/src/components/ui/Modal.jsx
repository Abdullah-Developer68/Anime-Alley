import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import { X } from "lucide-react";
import { cx } from "./styles";

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };

// Dialog with a dimmed backdrop. Escape and the backdrop close it unless `busy` is set.
const Modal = ({ open, onClose, title, description, size = "md", busy = false, children, footer }) => {
  const titleId = useId();

  useEffect(() => {
    if (!open)
      return;
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <m.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !busy && onClose()}
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cx("relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-surface shadow-float sm:rounded-panel", SIZES[size])}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[17px] font-medium tracking-[-0.01em] text-ink">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <footer className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">{footer}</footer>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;
