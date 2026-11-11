import PropTypes from "prop-types";
import { Pencil, Trash2 } from "lucide-react";
import assets from "../../assets/asset";

const SKELETON_ROWS = 6;

const alignClass = (align) => (align === "right" ? "text-right" : "text-left");

// One table for every dashboard list: a real <table> when its container is wide, stacked cards when narrow.
// The switch is a container query, so it follows the space left beside the sidebar, not the viewport.
const DataTable = ({ columns, rows, rowKey, loading, error, emptyMessage, actions, label }) => {
  const [primary, ...details] = columns;
  const status = loading ? "loading" : error ? "error" : rows.length === 0 ? "empty" : "rows";

  const message = status === "error" ? (
    <p role="alert" className="px-4 py-12 text-center text-sm text-red-300">{error}</p>
  ) : (
    <p className="px-4 py-12 text-center text-sm text-ink-400">{emptyMessage}</p>
  );

  return (
    <div className="@container overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900/60">
      {/* Wide layout */}
      <div className="hidden @2xl:block">
        <div className="max-h-[calc(100vh-17rem)] min-h-[16rem] overflow-auto">
          <table className="w-full border-collapse text-sm" aria-label={label} aria-busy={loading || undefined}>
            <thead className="sticky top-0 z-10 bg-ink-900">
              <tr className="border-b border-white/[0.08]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400 ${alignClass(col.align)} ${col.width || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
                {actions && (
                  <th scope="col" className="w-24 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {status === "loading" &&
                Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-4">
                        <div className={`h-3.5 animate-pulse rounded bg-white/[0.06] ${col.align === "right" ? "ml-auto w-14" : "w-3/4"}`} />
                      </td>
                    ))}
                    {actions && <td className="px-4 py-4" />}
                  </tr>
                ))}
              {(status === "error" || status === "empty") && (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)}>{message}</td>
                </tr>
              )}
              {status === "rows" &&
                rows.map((row) => (
                  <tr key={rowKey(row)} className="transition-colors hover:bg-white/[0.03]">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 align-middle text-ink-100 ${alignClass(col.align)}`}>
                        {col.render(row)}
                      </td>
                    ))}
                    {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Narrow layout */}
      <div className="@2xl:hidden" aria-busy={loading || undefined}>
        {status === "loading" && (
          <ul className="divide-y divide-white/[0.06]">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="space-y-3 p-4">
                <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
              </li>
            ))}
          </ul>
        )}
        {(status === "error" || status === "empty") && message}
        {status === "rows" && (
          <ul className="divide-y divide-white/[0.06]" aria-label={label}>
            {rows.map((row) => (
              <li key={rowKey(row)} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">{primary.render(row)}</div>
                  {actions && <div className="shrink-0">{actions(row)}</div>}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 @md:grid-cols-3">
                  {details.map((col) => (
                    <div key={col.key} className={`min-w-0 ${col.wideOnCard ? "col-span-2 @md:col-span-3" : ""}`}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{col.header}</dt>
                      <dd className="mt-1 text-sm text-ink-100">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
      align: PropTypes.oneOf(["left", "right"]),
      width: PropTypes.string,
      wideOnCard: PropTypes.bool,
    }),
  ).isRequired,
  rows: PropTypes.array.isRequired,
  rowKey: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  emptyMessage: PropTypes.string,
  actions: PropTypes.func,
  label: PropTypes.string.isRequired,
};

// Quiet icon buttons; only delete picks up a hint of colour, and only on hover
export const RowActions = ({ onEdit, onDelete, name }) => (
  <div className="inline-flex items-center gap-1">
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        title="Edit"
        aria-label={`Edit ${name}`}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <Pencil aria-hidden="true" className="h-4 w-4" />
      </button>
    )}
    {onDelete && (
      <button
        type="button"
        onClick={onDelete}
        title="Delete"
        aria-label={`Delete ${name}`}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    )}
  </div>
);

RowActions.propTypes = { onEdit: PropTypes.func, onDelete: PropTypes.func, name: PropTypes.string };

const DOT_TONES = {
  neutral: "bg-ink-500",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  info: "bg-sky-400",
  accent: "bg-violet-400",
  danger: "bg-red-400",
};

// Status as plain text with a small dot: colour carries meaning without filling the table
export const StatusDot = ({ tone = "neutral", children }) => (
  <span className="inline-flex items-center gap-2 text-sm text-ink-200">
    <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES[tone]}`} />
    {children}
  </span>
);

StatusDot.propTypes = { tone: PropTypes.oneOf(Object.keys(DOT_TONES)), children: PropTypes.node };

export const Avatar = ({ src, name, size = "h-8 w-8" }) => (
  <img
    src={src || assets.defaultProfile}
    alt=""
    title={name}
    referrerPolicy="no-referrer"
    className={`${size} shrink-0 rounded-full bg-white/5 object-cover ring-1 ring-white/10`}
    onError={(e) => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = assets.defaultProfile;
    }}
  />
);

Avatar.propTypes = { src: PropTypes.string, name: PropTypes.string, size: PropTypes.string };

// Name on top, secondary detail underneath; both truncate instead of stretching the column
export const Stacked = ({ title, subtitle, leading }) => (
  <div className="flex min-w-0 items-center gap-3">
    {leading}
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-ink-50">{title}</p>
      {subtitle && <p className="truncate text-xs text-ink-400">{subtitle}</p>}
    </div>
  </div>
);

Stacked.propTypes = { title: PropTypes.node, subtitle: PropTypes.node, leading: PropTypes.node };

export default DataTable;
