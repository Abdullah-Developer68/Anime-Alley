import { useFormContext } from "react-hook-form";
import FieldError from "./FieldError";
import { INPUT_CLASS, LABEL_CLASS } from "./constants";

// Name, description and price
const BasicFields = () => {
  const { register } = useFormContext();

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="product-name" className={LABEL_CLASS}>
          Name
        </label>
        <input
          id="product-name"
          type="text"
          className={INPUT_CLASS}
          placeholder="e.g. Berserk: Volume 15"
          {...register("productName", { required: "Product name is required!" })}
        />
        <FieldError name="productName" />
      </div>

      <div>
        <label htmlFor="product-description" className={LABEL_CLASS}>
          Description
        </label>
        <textarea
          id="product-description"
          rows="4"
          className={`${INPUT_CLASS} resize-y`}
          placeholder="What makes this item worth buying?"
          {...register("description", { required: "Description is required!" })}
        />
        <FieldError name="description" />
      </div>

      <div className="sm:w-1/2">
        <label htmlFor="product-price" className={LABEL_CLASS}>
          Price
        </label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
            $
          </span>
          <input
            id="product-price"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            className={`${INPUT_CLASS} pl-7 tabular-nums`}
            placeholder="0.00"
            {...register("price", {
              required: "Price is required!",
              validate: (value) =>
                (!isNaN(Number(value)) && Number(value) >= 0) || "Price must be a valid non-negative number",
            })}
          />
        </div>
        <FieldError name="price" />
      </div>
    </div>
  );
};

export default BasicFields;
