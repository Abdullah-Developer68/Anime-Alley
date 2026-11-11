export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy"];
// Categories whose stock is entered per variant instead of as a single number
export const VARIANT_CATEGORIES = ["clothes", "shoes", "comics"];

export const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-ink-200";
const FIELD_BASE =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white transition-colors hover:border-white/20 focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/15";
export const SELECT_CLASS = `${FIELD_BASE} h-10 cursor-pointer`;
export const INPUT_CLASS = `${FIELD_BASE} py-2.5 placeholder:text-ink-500`;
export const OPTION_CLASS = "bg-ink-900 text-white";
// Toggle chips (sizes, genres): the checkbox is visually hidden, so focus is shown on the chip itself
export const CHIP_CLASS =
  "inline-flex h-8 cursor-pointer select-none items-center rounded-full border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pink-400/60";
export const chipState = (selected) =>
  selected
    ? "border-pink-400/50 bg-pink-500/15 text-pink-100"
    : "border-white/10 bg-white/[0.03] text-ink-200 hover:border-white/20 hover:text-white";

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
    emptyMessage: "Pick at least one size under Details to enter its stock.",
    labelWidth: "min-w-[44px]",
    columns: "md:grid-cols-6",
    requiredPrefix: "Size",
  },
  volume: {
    title: "Stock per Volume",
    emptyMessage: "Add at least one volume number under Details to enter its stock.",
    labelWidth: "min-w-[54px]",
    columns: "md:grid-cols-4",
    requiredPrefix: "Volume",
  },
};
