import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoading: false, // Loading state for user history
};

const userHistorySlice = createSlice({
  name: "userHistory",
  initialState,
  reducers: {
    // Only manage loading state - data stays local in component
    setHistoryLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

// Action creators
export const { setHistoryLoading } = userHistorySlice.actions;

export default userHistorySlice.reducer;
