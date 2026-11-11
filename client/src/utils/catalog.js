import { BookOpen, Footprints, Shirt, Swords } from "lucide-react";
import assets from "../assets/asset";

// The four shop categories. `id` is what the API stores; `label` is what shoppers read.
export const CATEGORIES = [
  { id: "comics", label: "Comics", icon: BookOpen, blurb: "Manga volumes and graphic novels", image: assets.comicNaruto },
  { id: "toys", label: "Figures", icon: Swords, blurb: "Action figures, cars and dolls", image: assets.figureFighter },
  { id: "clothes", label: "Apparel", icon: Shirt, blurb: "Hoodies, tees and pants", image: assets.hoodieSurveyCorps },
  { id: "shoes", label: "Sneakers", icon: Footprints, blurb: "Hand-painted sneakers and boots", image: assets.sneakersSolo },
];

export const categoryLabel = (id) => CATEGORIES.find((category) => category.id === id)?.label || id;

// Product types per category; the server accepts the lower-case form
export const PRODUCT_TYPES = {
  comics: ["Action", "Adventure", "Comedy", "Drama", "Fantasy"],
  clothes: ["T-Shirt", "Jacket", "Pants"],
  shoes: ["Sneakers", "Boots"],
  toys: ["Action-Figure", "Car", "Doll"],
};

export const SORT_OPTIONS = [
  { value: "popular", label: "Featured" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
];

// What a variant is called in each category
export const variantName = (category) => (category === "comics" ? "Volume" : category === "toys" ? "Option" : "Size");

// The price slider runs from 0 to this; at the top it means "any price"
export const PRICE_CAP = 100;

// Cart limits enforced by the server (reservation.controller.js)
export const MAX_ITEM_QUANTITY = 10;
