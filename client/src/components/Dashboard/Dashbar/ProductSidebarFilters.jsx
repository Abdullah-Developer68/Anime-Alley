import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search } from "lucide-react";
import { resetProductFilters, setProductFilters } from "../../../redux/Slice/DashboardSlice";
import { CATEGORIES, PRICE_CAP, PRODUCT_TYPES } from "../../../utils/catalog";
import Button from "../../ui/Button";
import { cx, inputClass } from "../../ui/styles";

const sectionTitle = "mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-subtle";

const toDraft = (filters) => ({
  searchQuery: filters.searchQuery || "",
  price: Number(filters.price) || 0,
  category: filters.category || "comics",
  productTypes: filters.productTypes?.length ? filters.productTypes : ["all"],
});

// Filters for the dashboard's product table. Category applies at once; the rest on "Apply".
const ProductSidebarFilters = () => {
  const dispatch = useDispatch();
  const applied = useSelector((state) => state.dashboard.productFilters);
  const [draft, setDraft] = useState(() => toDraft(applied));

  // Resets from elsewhere refresh the draft
  useEffect(() => {
    setDraft(toDraft(applied));
  }, [applied]);

  const selectedTypes = draft.productTypes.includes("all") ? [] : draft.productTypes;
  const changed = JSON.stringify(draft) !== JSON.stringify(toDraft(applied));
  const filtered = applied.searchQuery || Number(applied.price) > 0 || applied.productTypes?.some((t) => t !== "all") || applied.category !== "comics";

  const toggleType = (type) => {
    const value = type.toLowerCase();
    const next = selectedTypes.includes(value) ? selectedTypes.filter((t) => t !== value) : [...selectedTypes, value];
    setDraft({ ...draft, productTypes: next.length ? next : ["all"] });
  };

  const changeCategory = (category) => {
    const next = { ...draft, category, productTypes: ["all"] };
    setDraft(next);
    dispatch(setProductFilters({ ...next, searchQuery: next.searchQuery.trim() }));
  };

  const apply = (e) => {
    e.preventDefault();
    dispatch(setProductFilters({ ...draft, searchQuery: draft.searchQuery.trim() }));
  };

  return (
    <form onSubmit={apply} className="space-y-5">
      <div>
        <label htmlFor="admin-search" className={sectionTitle}>
          Search
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <input
            id="admin-search"
            type="search"
            value={draft.searchQuery}
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, searchQuery: e.target.value })}
            placeholder="Product name"
            className={cx(inputClass, "h-9! pl-8! text-[13px]")}
          />
        </div>
      </div>

      <div>
        <label htmlFor="admin-category" className={sectionTitle}>
          Category
        </label>
        <select id="admin-category" value={draft.category} onChange={(e) => changeCategory(e.target.value)} className={cx(inputClass, "h-9! text-[13px]")}>
          {CATEGORIES.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={sectionTitle}>Type</legend>
        <div className="flex flex-wrap gap-1.5">
          {(PRODUCT_TYPES[draft.category] || []).map((type) => {
            const active = selectedTypes.includes(type.toLowerCase());
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(type)}
                className={cx(
                  "h-7 rounded-full border px-2.5 text-xs transition-colors",
                  active ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {type.replace("-", " ")}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="admin-price" className={cx(sectionTitle, "mb-0")}>
            Max price
          </label>
          <span className="text-xs tabular-nums text-ink">{draft.price > 0 ? `$${draft.price}` : "Any"}</span>
        </div>
        <input
          id="admin-price"
          type="range"
          min="0"
          max={PRICE_CAP}
          step="5"
          value={draft.price || PRICE_CAP}
          onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) >= PRICE_CAP ? 0 : Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!changed} className="flex-1">
          Apply
        </Button>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => dispatch(resetProductFilters())}>
            Reset
          </Button>
        )}
      </div>
    </form>
  );
};

export default ProductSidebarFilters;
