import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoading: false,
  getNewHistoryCounter: 0,
  purchaseHistory: JSON.parse(localStorage.getItem("purchaseHistory")) || [],
  totalPages: JSON.parse(localStorage.getItem("totalPages")) || 1,
};

const userHistorySlice = createSlice({
  name: "userHistory",
  initialState,
  reducers: {
    setHistoryLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    getNewHistoryCounter: (state) => {
      state.getNewHistoryCounter += 1;
    },
    cachePurchaseHistory: (state, action) => {
      state.purchaseHistory = action.payload;
      localStorage.setItem("purchaseHistory", JSON.stringify(action.payload));
    },
    setTotalPages: (state, action) => {
      state.totalPages = action.payload;
      localStorage.setItem("totalPages", JSON.stringify(action.payload));
    },
  },
});

export const {
  setHistoryLoading,
  getNewHistoryCounter,
  cachePurchaseHistory,
  setTotalPages,
} = userHistorySlice.actions;

export default userHistorySlice.reducer;
