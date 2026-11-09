import { useFormContext } from "react-hook-form";
import FieldError from "./FieldError";
import { LABEL_CLASS, SELECT_CLASS, TYPE_FIELDS } from "./constants";

// Clothes, shoe or toy type dropdown; its label and options come from TYPE_FIELDS
// eslint-disable-next-line react/prop-types
const TypeSelect = ({ name }) => {
  const { register, watch } = useFormContext();
  const selectedCategory = watch("category");
  const { label, category, requiredMessage, options } = TYPE_FIELDS[name];

  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      <select
        className={SELECT_CLASS}
        {...register(name, {
          validate: (value) =>
            selectedCategory !== category ||
            (typeof value === "string" && value.trim() !== "") ||
            requiredMessage,
        })}
      >
        <option className="text-white bg-black" value="">
          Select Type
        </option>
        {options.map(([value, text]) => (
          <option key={value} className="text-gray-300 bg-gray-800" value={value}>
            {text}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </div>
  );
};

export default TypeSelect;
