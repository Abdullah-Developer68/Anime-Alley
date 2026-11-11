import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import FieldError from "./FieldError";
import TypeSelect from "./TypeSelect";
import { CHIP_CLASS, LABEL_CLASS, SIZES, chipState } from "./constants";

// Sizes plus the clothes or shoe type; stays mounted (hidden) so the size validation stays registered
const ClothesShoesFields = () => {
  const { register, setValue, watch } = useFormContext();
  const selectedCategory = watch("category");
  const availableSizes = watch("availableSizes") || [];

  // availableSizes has no input of its own, so its rule is registered here
  useEffect(() => {
    register("availableSizes", {
      validate: (value) => {
        if (!["clothes", "shoes"].includes(selectedCategory)) return true;
        return (Array.isArray(value) && value.length > 0) || "At least one size is required!";
      },
    });
  }, [register, selectedCategory]);

  const toggleSize = (size) => {
    let newSizes;
    if (availableSizes.includes(size)) {
      newSizes = availableSizes.filter((s) => s !== size);
      // Clear stock field when size is unchecked
      setValue(`stock_${size}`, "");
    } else
      newSizes = [...availableSizes, size];
    setValue("availableSizes", newSizes, { shouldValidate: true });
  };

  return (
    <div
      className={`space-y-4 clothes-shoes-fields ${
        selectedCategory === "clothes" || selectedCategory === "shoes" ? "block" : "hidden"
      }`}
    >
      <div>
        <p className={LABEL_CLASS}>Available sizes</p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <label
              key={size}
              className={`${CHIP_CLASS} min-w-11 justify-center ${chipState(availableSizes.includes(size))}`}
            >
              <input
                type="checkbox"
                value={size}
                className="sr-only"
                checked={availableSizes.includes(size)}
                onChange={() => toggleSize(size)}
              />
              <span>{size}</span>
            </label>
          ))}
        </div>
        <FieldError name="availableSizes" />
      </div>
      {selectedCategory === "clothes" && <TypeSelect name="clothesType" />}
      {selectedCategory === "shoes" && <TypeSelect name="shoeType" />}
    </div>
  );
};

export default ClothesShoesFields;
