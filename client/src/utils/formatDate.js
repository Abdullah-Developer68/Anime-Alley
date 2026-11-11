const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// "12 Mar 2026", or an em dash when the value is missing or invalid
export const formatDate = (value) => {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
};

// "in 5 days", "yesterday", "3 days ago"
export const formatRelativeDays = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return relativeFormatter.format(Math.round((date.getTime() - Date.now()) / DAY_MS), "day");
};
