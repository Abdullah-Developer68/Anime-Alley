import { useFormContext } from "react-hook-form";
import { Info } from "lucide-react";
import FieldError from "./FieldError";
import { INPUT_CLASS, LABEL_CLASS, SIZES, VARIANT_CATEGORIES, VARIANT_STOCK, splitList, stockRules } from "./constants";

// Single stock number for toys and any category without variants
const SingleStock = () => {
  const { register } = useFormContext();

  return (
    <div>
      <label htmlFor="product-stock" className={LABEL_CLASS}>
        Units in stock
      </label>
      <input
        id="product-stock"
        type="number"
        step="1"
        min="0"
        inputMode="numeric"
        className={`${INPUT_CLASS} tabular-nums sm:w-1/2`}
        placeholder="0"
        {...register("stock", stockRules("Stock is required!"))}
      />
      <FieldError name="stock" />
    </div>
  );
};

// One stock input per selected size or entered volume, labelled with that variant
// eslint-disable-next-line react/prop-types
const VariantStock = ({ variant }) => {
  const { register, watch } = useFormContext();
  const { title, emptyMessage, labelWidth, columns, requiredPrefix } = VARIANT_STOCK[variant];
  const availableSizes = watch("availableSizes") || [];
  const volumes = watch("volumes");
  const labels = variant === "size" ? SIZES.filter((size) => availableSizes.includes(size)) : splitList(volumes);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink-200">{title}</p>
      {labels.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 p-3 text-xs text-ink-400">
          <Info aria-hidden="true" className="h-4 w-4 shrink-0" />
          {emptyMessage}
        </p>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${columns}`}>
          {labels.map((label) => (
            <div key={label} className="flex flex-col">
              <div className="flex overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 focus-within:border-pink-500/60">
                <span
                  className={`inline-flex items-center justify-center border-r border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-ink-200 ${labelWidth}`}
                >
                  {label}
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  aria-label={`Stock for ${requiredPrefix.toLowerCase()} ${label}`}
                  inputMode="numeric"
                  className="h-10 w-full min-w-0 bg-transparent px-3 text-sm tabular-nums text-white placeholder:text-ink-600 focus:outline-none"
                  placeholder="0"
                  {...register(`stock_${label}`, stockRules(`Stock for ${requiredPrefix} ${label} is required!`))}
                />
              </div>
              <FieldError name={`stock_${label}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Stock inputs for the selected category
const StockFields = () => {
  const { watch } = useFormContext();
  const selectedCategory = watch("category");

  return (
    <>
      <div className="space-y-4">{selectedCategory === "toys" && <SingleStock />}</div>

      {(selectedCategory === "clothes" || selectedCategory === "shoes") && (
        <VariantStock variant="size" />
      )}

      {selectedCategory === "comics" && (
        <VariantStock variant="volume" />
      )}

      {selectedCategory !== "" && selectedCategory !== "toys" && !VARIANT_CATEGORIES.includes(selectedCategory) && (
        <SingleStock />
      )}
    </>
  );
};

export default StockFields;
