export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy"];
// Categories whose stock is entered per variant instead of as a single number
export const VARIANT_CATEGORIES = ["clothes", "shoes", "comics"];

export const LABEL_CLASS = "block mb-1 text-sm font-medium text-gray-400";
export const SELECT_CLASS =
  "w-full px-3 py-2 text-sm text-white border rounded-lg sm:px-4 bg-white/5 border-white/10 focus:outline-none focus:border-pink-500 sm:text-base";
export const INPUT_CLASS = `${SELECT_CLASS} placeholder:text-white/50`;
export const CHIP_CLASS =
  "inline-flex items-center px-3 py-1 rounded-full border border-white/10 cursor-pointer hover:bg-white hover:text-black transition-colors text-sm";

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
