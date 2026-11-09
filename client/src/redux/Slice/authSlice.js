import { createSlice } from "@reduxjs/toolkit";

// UI state shared by the login/signup pages and the components in components/Auth
const initialState = {
  mode: "login", // "login" | "signup"
  step: 1, // Signup: 1 = email, 2 = otp, 3 = username/password
  loading: false,
  error: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Called when an auth page mounts so each visit starts clean
    setAuthMode: (_state, action) => ({ ...initialState, mode: action.payload }),
    setAuthStep: (state, action) => {
      state.step = action.payload;
    },
    setAuthLoading: (state, action) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setAuthMode, setAuthStep, setAuthLoading, setAuthError } = authSlice.actions;
export default authSlice.reducer;
