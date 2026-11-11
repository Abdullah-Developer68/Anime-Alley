import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItems: [],
  isLoading: false,
  isCartLoaded: false, // Whether the cart has been loaded from the server this visit
  // { code, percent } once the server has accepted the code; the server checks it again at checkout
  coupon: null,
  deliveryAddress: localStorage.getItem("deliveryAddress") || "",
  paymentMethod: "stripe", // "stripe" | "cod"
};

const sameLine = (item, id, variant) => item._id === id && item.selectedVariant === variant;

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCartItems: (state, action) => {
      state.cartItems = action.payload;
      state.isCartLoaded = true;
    },
    // Local mirrors of server changes (see cartThunks.js)
    addToCartLocal: (state, action) => {
      const newItem = action.payload;
      const existing = state.cartItems.find((item) => sameLine(item, newItem._id, newItem.selectedVariant));
      if (existing)
        existing.itemQuantity += newItem.itemQuantity;
      else
        state.cartItems.push(newItem);
    },
    updateCartItemLocal: (state, action) => {
      const { id, selectedVariant, newQuantity } = action.payload;
      if (newQuantity === 0)
        state.cartItems = state.cartItems.filter((item) => !sameLine(item, id, selectedVariant));
      else {
        const item = state.cartItems.find((line) => sameLine(line, id, selectedVariant));
        if (item)
          item.itemQuantity = newQuantity;
      }
    },
    emptyCartLocal: (state) => {
      state.cartItems = [];
      state.coupon = null;
    },
    setCartLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    applyCoupon: (state, action) => {
      state.coupon = action.payload;
    },
    resetCoupon: (state) => {
      state.coupon = null;
    },
    setDeliveryAddress: (state, action) => {
      state.deliveryAddress = action.payload;
      localStorage.setItem("deliveryAddress", action.payload);
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
  },
});

export const {
  setCartItems,
  addToCartLocal,
  updateCartItemLocal,
  emptyCartLocal,
  setCartLoading,
  applyCoupon,
  resetCoupon,
  setDeliveryAddress,
  setPaymentMethod,
} = cartSlice.actions;
export default cartSlice.reducer;
