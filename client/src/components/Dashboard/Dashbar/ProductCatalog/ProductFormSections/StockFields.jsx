import { useFormContext } from "react-hook-form";
import FieldError from "./FieldError";
import { INPUT_CLASS, LABEL_CLASS, SIZES, VARIANT_CATEGORIES, VARIANT_STOCK, splitList, stockRules } from "./constants";

// Single stock number for toys and any category without variants
const SingleStock = () => {
  const { register } = useFormContext();

  return (
    <div>
      <label className={LABEL_CLASS}>Stock</label>
      <input
        type="number"
        step="1"
        min="0"
        className={INPUT_CLASS}
        placeholder="Enter stock"
        {...register("stock", stockRules("Stock is required!"))}
      />
      <FieldError name="stock" />
    </div>
  );
};

// One stock input per selected size or entered volume, labelled with that variant
 
const VariantStock = ({ variant }) => {
  const { register, watch } = useFormContext();
  const { title, emptyMessage, labelWidth, columns, requiredPrefix } = VARIANT_STOCK[variant];
  const availableSizes = watch("availableSizes") || [];
  const volumes = watch("volumes");
  const labels = variant === "size" ? SIZES.filter((size) => availableSizes.includes(size)) : splitList(volumes);

  return (
    <div className="space-y-2">
      <label className={LABEL_CLASS}>{title}</label>
      {labels.length === 0 ? (
        <div className="rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-warning">
          {emptyMessage}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${columns}`}>
          {labels.map((label) => (
            <div key={label} className="flex flex-col">
              <div className="flex overflow-hidden rounded-lg border border-line bg-surface transition-colors focus-within:border-ink">
                <span className={`inline-flex items-center justify-center border-r border-line bg-canvas px-3 text-xs font-medium text-ink-soft ${labelWidth}`}>
                  {label}
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="h-10 w-full bg-transparent px-3 text-sm text-ink placeholder:text-subtle focus:outline-none"
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
