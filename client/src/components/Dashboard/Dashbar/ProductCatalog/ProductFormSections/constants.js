export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy"];
// Categories whose stock is entered per variant instead of as a single number
export const VARIANT_CATEGORIES = ["clothes", "shoes", "comics"];

import { inputClass, labelClass, textareaClass } from "../../../../ui/styles";

export const LABEL_CLASS = labelClass;
export const SELECT_CLASS = inputClass;
export const INPUT_CLASS = inputClass;
export const TEXTAREA_CLASS = textareaClass;
// Toggle chips for sizes and genres; the checked look comes from CHIP_ON / CHIP_OFF
export const CHIP_CLASS = "inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-[13px] transition-colors";
export const CHIP_ON = "border-ink bg-ink text-white";
export const CHIP_OFF = "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink";

// "V1, V2, " -> ["V1", "V2"]
export const splitList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item);

export const stockRules = (requiredMessage) => ({
  required: requiredMessage,
  min: { value: 0, message: "Stock cannot be negative" },
  validate: (value) => Number.isInteger(Number(value)) || "Must be a valid integer",
});

// Dropdowns that are required only for their own category
export const TYPE_FIELDS = {
  clothesType: {
    label: "Clothes Type",
    category: "clothes",
    requiredMessage: "Clothes type is required!",
    options: [
      ["t-shirt", "T-Shirt"],
      ["jacket", "Jacket"],
      ["pants", "Pants"],
    ],
  },
  shoeType: {
    label: "Shoe Type",
    category: "shoes",
    requiredMessage: "Shoe type is required!",
    options: [
      ["sneakers", "Sneakers"],
      ["boots", "Boots"],
    ],
  },
  toyType: {
    label: "Toy Type",
    category: "toys",
    requiredMessage: "Toy type is required!",
    options: [
      ["action-figure", "Action Figure"],
      ["car", "Car"],
      ["doll", "Doll"],
    ],
  },
};

// Per-variant stock grids: sizes for clothes/shoes, volumes for comics
export const VARIANT_STOCK = {
  size: {
    title: "Stock per Size",
    emptyMessage: "Please select at least one size below under Additional Details to enter stock values.",
    labelWidth: "min-w-[44px]",
    columns: "md:grid-cols-6",
    requiredPrefix: "Size",
  },
  volume: {
    title: "Stock per Volume",
    emptyMessage: "Please enter at least one volume number below under Additional Details to enter stock values.",
    labelWidth: "min-w-[54px]",
    columns: "md:grid-cols-4",
    requiredPrefix: "Volume",
  },
};
