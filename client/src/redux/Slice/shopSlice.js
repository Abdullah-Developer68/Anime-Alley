import { createSlice } from "@reduxjs/toolkit";
import { CATEGORIES } from "../../utils/catalog";

export const DEFAULT_FILTERS = { productTypes: ["all"], sortBy: "popular", price: 0, searchQuery: "" };

// Older versions kept whole product lists here, which went stale; they are dropped on load
["shopProductsCache", "productData", "shopTotalPages", "openFilterBar", "productTypes"].forEach((key) => localStorage.removeItem(key));

const readJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const storedCategory = localStorage.getItem("currCategory");

// Where the shopper was (category, filters, page) survives reloads; product data is always fetched
// fresh, and the browser's 30-second HTTP cache makes going back and forth instant
const initialState = {
  currCategory: CATEGORIES.some(({ id }) => id === storedCategory) ? storedCategory : "comics",
  filters: { ...DEFAULT_FILTERS, ...readJSON("shopFilters", {}) },
  currPage: Math.max(parseInt(localStorage.getItem("shopCurrPage"), 10) || 1, 1),
  filtersOpen: false,
  products: [],
  // Which query `products` answers, so returning to the shop doesn't refetch the same page
  productsKey: null,
  totalPages: 1,
  totalProducts: 0,
  isLoading: false,
  // The product being viewed, handed over by the card that was clicked
  productData: null,
};

const persist = (state) => {
  localStorage.setItem("currCategory", state.currCategory);
  localStorage.setItem("shopFilters", JSON.stringify(state.filters));
  localStorage.setItem("shopCurrPage", String(state.currPage));
};

const shopSlice = createSlice({
  name: "shop",
  initialState,
  reducers: {
    // Product types belong to one category, so switching category clears them
    setCategory: (state, action) => {
      state.currCategory = action.payload;
      state.filters.productTypes = ["all"];
      state.currPage = 1;
      persist(state);
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currPage = 1;
      persist(state);
    },
    resetFilters: (state) => {
      state.filters = { ...DEFAULT_FILTERS };
      state.currPage = 1;
      persist(state);
    },
    setPage: (state, action) => {
      state.currPage = action.payload;
      persist(state);
    },
    setFiltersOpen: (state, action) => {
      state.filtersOpen = action.payload;
    },
    // Ends loading in the same update: the re-render it triggers cancels the request's own cleanup
    setResults: (state, action) => {
      const { products, totalPages, totalProducts, key } = action.payload;
      state.products = products;
      state.totalPages = totalPages;
      state.totalProducts = totalProducts;
      state.productsKey = key;
      state.isLoading = false;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    transferProductData: (state, action) => {
      state.productData = action.payload;
    },
  },
});

export const {
  setCategory,
  setFilters,
  resetFilters,
  setPage,
  setFiltersOpen,
  setResults,
  setLoading,
  transferProductData,
} = shopSlice.actions;

export default shopSlice.reducer;
