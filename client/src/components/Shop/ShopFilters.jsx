import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search } from "lucide-react";
import { resetFilters, setCategory, setFilters, setFiltersOpen } from "../../redux/Slice/shopSlice";
import { CATEGORIES, PRICE_CAP, PRODUCT_TYPES } from "../../utils/catalog";
import Button from "../ui/Button";
import { cx, inputClass } from "../ui/styles";

const sectionTitle = "mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle";

// "all" or no types means no type filter
const isAllTypes = (types) => !types?.length || types.includes("all");

// Category list plus a draft of the filters. Changes apply when "Show results" is pressed, so a
// shopper can tick several boxes without the grid reloading after each one.
const ShopFilters = () => {
  const dispatch = useDispatch();
  const currCategory = useSelector((state) => state.shop.currCategory);
  const applied = useSelector((state) => state.shop.filters);
  const [draft, setDraft] = useState(applied);

  // A reset or category change elsewhere refreshes the draft
  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const types = PRODUCT_TYPES[currCategory] || [];
  const selectedTypes = isAllTypes(draft.productTypes) ? [] : draft.productTypes;
  const price = draft.price > 0 && draft.price < PRICE_CAP ? draft.price : PRICE_CAP;

  const toggleType = (type) => {
    const value = type.toLowerCase();
    const next = selectedTypes.includes(value) ? selectedTypes.filter((t) => t !== value) : [...selectedTypes, value];
    setDraft({ ...draft, productTypes: next.length ? next : ["all"] });
  };

  const changed = JSON.stringify(draft) !== JSON.stringify(applied);
  const filtered = !isAllTypes(applied.productTypes) || applied.price > 0 || applied.searchQuery;

  const apply = (e) => {
    e.preventDefault();
    dispatch(setFilters({ ...draft, searchQuery: draft.searchQuery.trim() }));
    dispatch(setFiltersOpen(false));
  };

  return (
    <form onSubmit={apply} className="flex flex-col gap-7">
      <div>
        <p className={sectionTitle}>Category</p>
        <ul className="space-y-0.5">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setCategory(id));
                  dispatch(setFiltersOpen(false));
                }}
                aria-current={currCategory === id ? "true" : undefined}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                  currCategory === id ? "bg-surface font-medium text-ink shadow-panel ring-1 ring-line" : "text-ink-soft hover:bg-sunken hover:text-ink",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label htmlFor="shop-search" className={sectionTitle + " block"}>
          Search
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            id="shop-search"
            type="search"
            value={draft.searchQuery}
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, searchQuery: e.target.value })}
            placeholder="Name or series"
            className={cx(inputClass, "pl-9!")}
          />
        </div>
      </div>

      <fieldset>
        <legend className={sectionTitle}>Type</legend>
        <div className="flex flex-wrap gap-1.5">
          {types.map((type) => {
            const active = selectedTypes.includes(type.toLowerCase());
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(type)}
                className={cx(
                  "h-8 rounded-full border px-3 text-[13px] transition-colors",
                  active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {type.replace("-", " ")}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <label htmlFor="shop-price" className={sectionTitle + " mb-0"}>
            Max price
          </label>
          <span className="text-[13px] tabular-nums text-ink">{price >= PRICE_CAP ? "Any" : `$${price}`}</span>
        </div>
        <input
          id="shop-price"
          type="range"
          min="5"
          max={PRICE_CAP}
          step="5"
          value={price}
          onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) >= PRICE_CAP ? 0 : Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!changed} className="flex-1">
          Show results
        </Button>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => dispatch(resetFilters())}>
            Reset
          </Button>
        )}
      </div>
    </form>
  );
};

export default ShopFilters;
