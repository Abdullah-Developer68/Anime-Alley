import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";
import { setCartItems, addToCartLocal, updateCartItemLocal, emptyCartLocal, setCartLoading } from "../Slice/cartSlice";

const messageOf = (error, fallback) => error.response?.data?.message || fallback;

// Load cart from server
export const loadCartFromServer = createAsyncThunk("cart/loadFromServer", async (_, { dispatch, rejectWithValue }) => {
  dispatch(setCartLoading(true));
  try {
    const { data } = await api.getCart();
    dispatch(setCartItems(data.cartItems || []));
    return data.cartItems;
  } catch (error) {
    return rejectWithValue(messageOf(error, "Failed to load cart"));
  } finally {
    dispatch(setCartLoading(false));
  }
});

// Reserve stock on the server, then mirror it locally with the quantity the server actually reserved
export const addToCartAsync = createAsyncThunk("cart/addToCartAsync", async ({ product, variant, quantity }, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.reserveStock(product._id, variant, quantity);
    dispatch(addToCartLocal({ ...product, selectedVariant: variant, itemQuantity: data.reservedQuantity || quantity }));
    return data;
  } catch (error) {
    return rejectWithValue(messageOf(error, "Failed to add to cart"));
  }
});

export const updateCartItemAsync = createAsyncThunk("cart/updateCartItemAsync", async ({ id, variant, newQuantity }, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.updateCartItem(id, variant, newQuantity);
    dispatch(updateCartItemLocal({ id, selectedVariant: variant, newQuantity }));
    return data;
  } catch (error) {
    return rejectWithValue(messageOf(error, "Failed to update cart"));
  }
});

export const clearCartAsync = createAsyncThunk("cart/clearCartAsync", async (_, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.clearCart();
    dispatch(emptyCartLocal());
    return data;
  } catch (error) {
    return rejectWithValue(messageOf(error, "Failed to clear cart"));
  }
});
