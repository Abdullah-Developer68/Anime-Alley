import { useFormContext } from "react-hook-form";
import { BookOpen, Footprints, Shirt, ToyBrick } from "lucide-react";
import FieldError from "./FieldError";

const CATEGORIES = [
  { value: "comics", label: "Comics", hint: "Volumes", icon: BookOpen },
  { value: "clothes", label: "Clothes", hint: "Sizes", icon: Shirt },
  { value: "shoes", label: "Shoes", hint: "Sizes", icon: Footprints },
  { value: "toys", label: "Toys", hint: "Single stock", icon: ToyBrick },
];

// Radio cards instead of a dropdown: the category decides every field below it, so it should be visible at a glance
const CategoryPicker = () => {
  const { register, watch } = useFormContext();
  const selected = watch("category");

  return (
    <fieldset>
      <legend className="sr-only">Category</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CATEGORIES.map(({ value, label, hint, icon: Icon }) => {
          const isSelected = selected === value;
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pink-400/60 ${
                isSelected
                  ? "border-pink-400/50 bg-pink-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              <input
                type="radio"
                value={value}
                className="sr-only"
                {...register("category", { required: "Category is required!" })}
              />
              <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${isSelected ? "text-pink-300" : "text-ink-400"}`} />
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${isSelected ? "text-white" : "text-ink-100"}`}>{label}</span>
                <span className="block text-xs text-ink-500">{hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      <FieldError name="category" />
    </fieldset>
  );
};

export default CategoryPicker;
