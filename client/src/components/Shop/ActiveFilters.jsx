import { useDispatch, useSelector } from "react-redux";
import { X } from "lucide-react";
import { resetFilters, setFilters } from "../../redux/Slice/shopSlice";

const chipClass =
  "inline-flex h-7 items-center gap-1 rounded-full border border-line bg-surface pl-3 pr-1.5 text-xs text-ink-soft transition-colors hover:border-line-strong hover:text-ink";

// Removable chips for each applied filter
const ActiveFilters = () => {
  const dispatch = useDispatch();
  const { productTypes, price, searchQuery } = useSelector((state) => state.shop.filters);
  const types = productTypes.filter((type) => type !== "all");

  const chips = [
    searchQuery && { key: "search", label: `"${searchQuery}"`, clear: { searchQuery: "" } },
    ...types.map((type) => ({
      key: type,
      label: type.replace("-", " "),
      clear: { productTypes: types.length > 1 ? types.filter((t) => t !== type) : ["all"] },
    })),
    price > 0 && { key: "price", label: `Up to $${price}`, clear: { price: 0 } },
  ].filter(Boolean);

  if (chips.length === 0)
    return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map(({ key, label, clear }) => (
        <button key={key} type="button" onClick={() => dispatch(setFilters(clear))} className={chipClass} aria-label={`Remove filter ${label}`}>
          <span className="capitalize">{label}</span>
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={() => dispatch(resetFilters())} className="px-2 text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
          Clear all
        </button>
      )}
    </div>
  );
};

export default ActiveFilters;
