import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  componentLoadStatus: {
    banner: false,
    comics: false,
    clothes: false,
    actionFigures: false,
  },
  isLoading: true,
  loadingProgress: 0,
};

const homeSlice = createSlice({
  name: "home",
  initialState,
  reducers: {
    markComponentLoaded: (state, action) => {
      const componentName = action.payload;
      state.componentLoadStatus[componentName] = true;

      // Calculate progress
      const loadedCount = Object.values(state.componentLoadStatus).filter(
        Boolean
      ).length;
      const totalComponents = Object.keys(state.componentLoadStatus).length;
      state.loadingProgress = Math.round((loadedCount / totalComponents) * 100);

      // Check if all components are loaded
      if (loadedCount === totalComponents) {
        state.isLoading = false;
      }
    },
    resetLoadingState: (state) => {
      state.componentLoadStatus = {
        banner: false,
        comics: false,
        clothes: false,
        actionFigures: false,
      };
      state.isLoading = true;
      state.loadingProgress = 0;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { markComponentLoaded, resetLoadingState, setLoading } =
  homeSlice.actions;
export default homeSlice.reducer;
