import { createSlice } from "@reduxjs/toolkit";

// Get initial values from localStorage or use defaults
const initialState = {
  currCategory: localStorage.getItem("currCategory") || "comics",
  openFilterBar: JSON.parse(localStorage.getItem("openFilterBar")) || false,
  productTypes: JSON.parse(localStorage.getItem("productTypes")) || {},
  currPage: parseInt(localStorage.getItem("currPage")) || 1,
  totalPages: parseInt(localStorage.getItem("totalPages")) || 1,
  productData: JSON.parse(localStorage.getItem("productData")) || {},
  isLoading: false, // Loading state for products
};

const shopSlice = createSlice({
  name: "shop",
  initialState,
  reducers: {
    // Actions are written below. They are plain JavaScript objects that describe what should happen in the Redux store.
    //Every action has a type (a string) and optionally a payload (data needed for the action).
    //state is used to access the current value of the property in initailState and payload contains values that are passed to it
    setCategory: (state, action) => {
      state.currCategory = action.payload;
      localStorage.setItem("currCategory", action.payload);
    },
    openFilterBar: (state, action) => {
      state.openFilterBar = action.payload;
      localStorage.setItem("openFilterBar", JSON.stringify(action.payload));
    },
    transferFilterData: (state, action) => {
      state.productTypes = action.payload;
      localStorage.setItem("productTypes", JSON.stringify(action.payload));
    },
    updateCurrPage: (state, action) => {
      state.currPage = action.payload;
      localStorage.setItem("currPage", action.payload);
    },
    updateTotalPages: (state, action) => {
      state.totalPages = action.payload;
      localStorage.setItem("totalPages", action.payload);
    },
    transferProductData: (state, action) => {
      state.productData = action.payload;
      localStorage.setItem("productData", JSON.stringify(action.payload));
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function by redux toolkit
// Action creators are functions that create actions. They simply return an action object (contains type and payload).
export const {
  setCategory,
  openFilterBar,
  transferFilterData,
  updateCurrPage,
  updateTotalPages,
  transferProductData,
  setLoading,
} = shopSlice.actions;

export default shopSlice.reducer;
