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
// eslint-disable-next-line react/prop-types
const VariantStock = ({ variant }) => {
  const { register, watch } = useFormContext();
  const { title, emptyMessage, labelWidth, columns, requiredPrefix } = VARIANT_STOCK[variant];
  const availableSizes = watch("availableSizes") || [];
  const volumes = watch("volumes");
  const labels = variant === "size" ? SIZES.filter((size) => availableSizes.includes(size)) : splitList(volumes);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">{title}</label>
      {labels.length === 0 ? (
        <div className="p-3 text-xs text-yellow-400 border rounded-lg bg-yellow-400/10 border-yellow-400/20">
          {emptyMessage}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${columns}`}>
          {labels.map((label) => (
            <div key={label} className="flex flex-col">
              <div className="flex overflow-hidden transition-colors border rounded-lg border-white/10 bg-white/5 focus-within:border-pink-500">
                <span
                  className={`inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white/90 bg-white/10 border-r border-white/10 ${labelWidth}`}
                >
                  {label}
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="w-full px-3 py-2 text-sm text-white bg-transparent placeholder:text-white/40 focus:outline-none sm:text-base"
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
