import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoading: false, // Loading state for user history
  getNewHistoryCounter: 0, // Flag to trigger fetching new history data
};

const userHistorySlice = createSlice({
  name: "userHistory",
  initialState,
  reducers: {
    // Only manage loading state - data stays local in component
    setHistoryLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    getNewHistoryCounter: (state) => {
      state.getNewHistoryCounter += 1; // Increment to trigger useEffect in component
    },
  },
});

// Action creators
export const { setHistoryLoading, getNewHistoryCounter } = userHistorySlice.actions;

export default userHistorySlice.reducer;
