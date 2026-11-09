import axios from "axios";
import { clearAllUserData } from "../utils/userSessionManager";

// Use development URL in dev mode, production URL in production mode
const isDevelopment = import.meta.env.MODE === "development";
const serverURL = isDevelopment
  ? "http://localhost:3000"
  : import.meta.env.VITE_API_BASE_URL;

// axios automatically sets the headers content type for api requests
// No cookies: auth is the Bearer header below, which other sites can't make the browser send
const api = axios.create({
  baseURL: `${serverURL}/api`,
});

// Add request interceptor to include Authorization header if token exists in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token)
      config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    // this ensures that the error is passed down to the catch block handler in the code 1.e, (AuthProvider.jsx, Signup.jsx, Login.jsx)
    return Promise.reject(error);
  },
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If we get a 401 error, the token might be expired or invalid
    if (error.response?.status === 401)
      // Clear all user data from localStorage
      clearAllUserData();
    return Promise.reject(error);
  },
);

// --- AUTH API'S ---

// Google OAuth is a full-page redirect, not an XHR call
api.googleLogin = () => {
  window.location.href = `${serverURL}/api/googleAuth/login`;
};
api.sendSignupOtp = (email) => {
  return api.post("/auth/otp", { email });
};
api.verifySignupOtp = (email, otp) => {
  return api.post("/auth/otp/verify", { email, otp });
};
api.signUp = (signupData) => {
  return api.post("/auth/signup", signupData);
};
api.login = (loginData) => {
  return api.post("/auth/login", loginData);
};
// Returns the user for the stored token (local and Google logins use the same JWT)
api.verifyAuth = () => {
  return api.get("/auth/me");
};
api.logout = () => {
  return api.post("/auth/logout");
};
api.demoLogin = (role) => {
  return api.post("/auth/demo-login", { role });
};

// --- PRODUCT API'S ---

api.getProducts = (productConstraints) => {
  return api.get("/products", {
    params: {
      productConstraints: JSON.stringify(productConstraints),
    },
  });
};
api.createProduct = (productData) => {
  return api.post("/products", productData);
};
api.updateProduct = (productId, productData) => {
  return api.put(`/products/${productId}`, productData);
};
api.deleteProduct = (productId) => {
  return api.delete(`/products/${productId}`);
};

// --- ORDER API'S ---

// The server identifies the user from the auth token, so no user info is sent
api.placeOrder = (couponCode, deliveryAddress, paymentMethod) => {
  return api.post("/orders", {
    couponCode,
    deliveryAddress,
    paymentMethod,
  });
};
api.getOrderHistory = (currPage) => {
  return api.get("/orders/me", { params: { currPage } });
};
api.getAllOrdersList = (currPage) => {
  return api.get("/orders", { params: { currPage } });
};
api.getOrderStats = () => {
  return api.get("/orders/stats");
};
api.updateOrder = (orderId, orderData) => {
  return api.patch(`/orders/${orderId}`, orderData);
};
api.deleteOrder = (orderId) => {
  return api.delete(`/orders/${orderId}`);
};

// --- USER API'S ---

api.getUsers = (currPage, searchQuery, role) => {
  return api.get("/users", {
    params: {
      currPage,
      searchQuery,
      role,
    },
  });
};
api.updateUser = (userId, userData) => {
  const formData = new FormData();
  Object.entries(userData).forEach(([key, value]) => {
    if (value !== undefined && value !== null)
      formData.append(key, value);
  });
  return api.patch(`/users/${userId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
api.deleteUser = (userId) => {
  return api.delete(`/users/${userId}`);
};

// --- COUPON API'S ---

api.verifyCouponCode = (couponCode) => {
  return api.get("/coupons/eligibility", { params: { code: couponCode } });
};
api.getAllCoupons = (currPage) => {
  return api.get("/coupons", { params: { currPage } });
};
api.getCouponStats = () => {
  return api.get("/coupons/stats");
};
api.createCoupon = (couponData) => {
  return api.post("/coupons", couponData);
};
api.updateCoupon = (couponId, couponData) => {
  return api.patch(`/coupons/${couponId}`, couponData);
};
api.deleteCoupon = (couponId) => {
  return api.delete(`/coupons/${couponId}`);
};

// --- EXPORT API ---

api.exportData = (dataType, format) => {
  return api.get(`/exports/${dataType}`, {
    params: {
      format,
    },
    responseType: "blob", // Important for handling file downloads
  });
};

// --- CART API'S ---

api.getCart = () => {
  return api.get("/cart");
};
// Adding an item to the cart reserves its stock
api.reserveStock = (productId, variant, quantity) => {
  return api.post("/cart/items", {
    productId,
    variant,
    quantity: typeof quantity === "number" ? quantity : Number(quantity),
  });
};
api.updateCartItem = (productId, variant, newQuantity) => {
  return api.patch(`/cart/items/${productId}`, {
    variant,
    quantity: typeof newQuantity === "number" ? newQuantity : Number(newQuantity),
  });
};
api.clearCart = () => {
  return api.delete("/cart");
};

// --- CHECKOUT API'S ---

api.createCheckOutSession = (paymentData) => {
  return api.post("/checkout-sessions", { paymentData });
};
// Has the Stripe webhook created the order for this checkout session yet?
api.verifyOrder = (stripeSessionID) => {
  return api.get(`/checkout-sessions/${encodeURIComponent(stripeSessionID)}/order`);
};

export default api;
