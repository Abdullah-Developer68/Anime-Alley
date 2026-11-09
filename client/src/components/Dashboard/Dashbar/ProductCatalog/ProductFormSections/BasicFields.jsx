import { useFormContext } from "react-hook-form";
import FieldError from "./FieldError";
import { INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from "./constants";

const CATEGORIES = [
  ["comics", "Comics"],
  ["clothes", "Clothes"],
  ["shoes", "Shoes"],
  ["toys", "Toys"],
];

// Name, description, price and category
const BasicFields = () => {
  const { register } = useFormContext();

  return (
    <>
      <div>
        <label className={LABEL_CLASS}>Product Name</label>
        <input
          type="text"
          className={INPUT_CLASS}
          placeholder="Enter product name"
          {...register("productName", { required: "Product name is required!" })}
        />
        <FieldError name="productName" />
      </div>

      <div>
        <label className={LABEL_CLASS}>Description</label>
        <textarea
          rows="3"
          className={INPUT_CLASS}
          placeholder="Enter product description"
          {...register("description", { required: "Description is required!" })}
        />
        <FieldError name="description" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Price</label>
          <input
            type="number"
            step="any"
            min="0"
            className={INPUT_CLASS}
            placeholder="Enter price"
            {...register("price", {
              required: "Price is required!",
              validate: (value) =>
                (!isNaN(Number(value)) && Number(value) >= 0) || "Price must be a valid non-negative number",
            })}
          />
          <FieldError name="price" />
        </div>

        <div>
          <label className={LABEL_CLASS}>Category</label>
          <select className={SELECT_CLASS} {...register("category", { required: "Category is required!" })}>
            <option className="text-white bg-black" value="">
              Select Category
            </option>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} className="text-gray-300 bg-gray-800" value={value}>
                {label}
              </option>
            ))}
          </select>
          <FieldError name="category" />
        </div>
      </div>
    </>
  );
};

export default BasicFields;
