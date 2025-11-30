import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItems: [],
  couponApplied: false,
  couponCode: "",
  isLoading: false,
  isCartLoaded: false, // Track if cart has been loaded from server
  // Coupon modal state
  couponModalOpen: false,
  // Checkout data
  deliveryAddress: localStorage.getItem("deliveryAddress") || "",
  paymentMethod: "",
  // Individual payment and coupon states
  discountedPrice: 0,
  finalTotal: 0, // finalTotal = ( subtotal + shipping cost ) - discount
  originalTotal: 0,
  discountAmount: 0,
  shouldProceedWithOrder: false, // Flag to trigger order placement
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Set cart items from server
    setCartItems: (state, action) => {
      state.cartItems = action.payload;
      state.isCartLoaded = true;
    },

    // Local cart operations (will trigger server sync)
    addToCartLocal: (state, action) => {
      const newItem = action.payload;
      const existingItem = state.cartItems.find(
        (item) =>
          item._id === newItem._id &&
          item.selectedVariant === newItem.selectedVariant
      );

      if (existingItem) {
        existingItem.itemQuantity += newItem.itemQuantity;
      } else {
        state.cartItems.push(newItem);
      }
    },
    updateCartItemLocal: (state, action) => {
      const { id, selectedVariant, newQuantity } = action.payload;
      const item = state.cartItems.find(
        (item) => item._id === id && item.selectedVariant === selectedVariant
      );
      if (item) {
        if (newQuantity === 0) {
          state.cartItems = state.cartItems.filter(
            (item) =>
              !(item._id === id && item.selectedVariant === selectedVariant)
          );
        } else {
          item.itemQuantity = newQuantity;
        }
      }
    },

    removeFromCartLocal: (state, action) => {
      const { id, selectedVariant } = action.payload;
      state.cartItems = state.cartItems.filter(
        (item) => !(item._id === id && item.selectedVariant === selectedVariant)
      );
    },

    emptyCartLocal: (state) => {
      state.cartItems = [];
    },

    // Keep existing coupon actions unchanged
    applyCoupon: (state, action) => {
      const { couponCode, finalCost } = action.payload;
      console.log("REDUX STORE COUPON DATA:", action.payload);
      state.couponApplied = true;
      state.couponCode = couponCode;
      state.finalTotal = finalCost; // Use finalTotal instead of finalCost
    },

    resetCoupon: (state) => {
      state.couponApplied = false;
      state.couponCode = "";
      state.finalTotal = 0; // Use finalTotal instead of finalCost
    },

    setCartLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    // Coupon modal actions
    openCouponModal: (state) => {
      state.couponModalOpen = true;
    },
    closeCouponModal: (state) => {
      state.couponModalOpen = false;
    },
    // Checkout data actions
    setDeliveryAddress: (state, action) => {
      state.deliveryAddress = action.payload;
      localStorage.setItem("deliveryAddress", action.payload);
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },

    // Individual state setters
    setDiscountedPrice: (state, action) => {
      state.discountedPrice = action.payload;
    },

    setFinalTotal: (state, action) => {
      state.finalTotal = action.payload;
    },

    setOriginalTotal: (state, action) => {
      state.originalTotal = action.payload;
    },

    setDiscountAmount: (state, action) => {
      state.discountAmount = action.payload;
    },

    setShouldProceedWithOrder: (state, action) => {
      state.shouldProceedWithOrder = action.payload;
    },
  },
});

export const {
  setCartItems,
  addToCartLocal,
  updateCartItemLocal,
  removeFromCartLocal,
  emptyCartLocal,
  applyCoupon,
  resetCoupon,
  setCartLoading,
  openCouponModal,
  closeCouponModal,
  setDeliveryAddress,
  setPaymentMethod,
  setDiscountedPrice,
  setFinalTotal,
  setOriginalTotal,
  setDiscountAmount,
  setShouldProceedWithOrder,
} = cartSlice.actions;
export default cartSlice.reducer;
