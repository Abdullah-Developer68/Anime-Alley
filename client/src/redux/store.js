import { configureStore } from "@reduxjs/toolkit";
import shopReducer from "./Slice/shopSlice";
import cartReducer from "./Slice/cartSlice";
import dashboardReducer from "./Slice/DashboardSlice";
import homeReducer from "./Slice/homeSlice";
import userHistoryReducer from "./Slice/userHistorySlice";

const store = configureStore({
  reducer: {
    shop: shopReducer, // best practice is that Key should match the slice name in the reducer
    cart: cartReducer,
    dashboard: dashboardReducer,
    home: homeReducer,
    userHistory: userHistoryReducer,
  },
});

export default store;
