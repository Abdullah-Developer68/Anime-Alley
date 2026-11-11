import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "./styles";

// First, last, and the current page with its neighbours; gaps become "…"
const pageWindow = (current, total) => {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((page, i) => (i > 0 && page - sorted[i - 1] > 1 ? ["gap-" + page, page] : [page]));
};

const stepClass =
  "flex h-8 items-center gap-1 rounded-full px-3 text-[13px] text-ink-soft transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-35";

// Page buttons; onPageChange receives the new page number
const Pagination = ({ page, totalPages, onPageChange, label = "Pages", className }) => {
  if (totalPages <= 1)
    return null;
  return (
    <nav aria-label={label} className={cx("flex items-center gap-1", className)}>
      <button type="button" className={stepClass} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        <span className="max-sm:sr-only">Previous</span>
      </button>
      {pageWindow(page, totalPages).map((item) =>
        typeof item === "string" ? (
          <span key={item} className="px-1 text-[13px] text-subtle">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cx(
              "h-8 min-w-8 rounded-full px-2 text-[13px] font-medium tabular-nums transition-colors",
              item === page ? "bg-ink text-white" : "text-ink-soft hover:bg-sunken hover:text-ink",
            )}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" className={stepClass} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        <span className="max-sm:sr-only">Next</span>
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </nav>
  );
};

export default Pagination;
