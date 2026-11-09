import { ChevronLeft, ChevronRight } from "lucide-react";

// First, last, and the current page with its neighbours; gaps become "…"
const pageWindow = (current, total) => {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((page, i) => (i > 0 && page - sorted[i - 1] > 1 ? ["gap-" + page, page] : [page]));
};

// Shared footer for the dashboard tables. onPageChange takes a page number, "prev" or "next".
// eslint-disable-next-line react/prop-types
const DashboardPagination = ({ currPage, totalPages, totalItems, itemCount, pageSize, label, onPageChange }) => {
  const first = (currPage - 1) * pageSize + 1;
  const navButton = "flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-white/5";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-400">
        {itemCount > 0
          ? `Showing ${first}–${first + itemCount - 1} of ${totalItems} ${label}`
          : `No ${label} found`}
      </p>

      {totalPages > 1 && (
        <nav aria-label={`${label} pages`} className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={navButton} onClick={() => onPageChange("prev")} disabled={currPage === 1}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            <span className="max-sm:sr-only">Previous</span>
          </button>
          {pageWindow(currPage, totalPages).map((page) =>
            typeof page === "string" ? (
              <span key={page} className="px-1 text-sm text-slate-500">…</span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === currPage ? "page" : undefined}
                className={`h-9 min-w-9 cursor-pointer rounded-lg px-2.5 text-sm font-medium transition ${
                  page === currPage
                    ? "bg-pink-500 text-slate-950"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {page}
              </button>
            ),
          )}
          <button type="button" className={navButton} onClick={() => onPageChange("next")} disabled={currPage === totalPages}>
            <span className="max-sm:sr-only">Next</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
};

export default DashboardPagination;
