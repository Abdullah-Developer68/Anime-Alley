import { clearAllUserData } from "../utils/userSessionManager";

// In development the API runs on localhost:3000 unless VITE_DEV_API_URL says otherwise
const serverURL = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_API_URL || "http://localhost:3000"
  : import.meta.env.VITE_API_BASE_URL;
const API_ROOT = `${serverURL}/api`;

// Errors look like axios errors (error.response.status / .data), so callers read them the same way
class ApiError extends Error {
  constructor(message, response) {
    super(message);
    this.name = "ApiError";
    this.response = response;
  }
}

const buildUrl = (path, params) => {
  const url = new URL(API_ROOT + path);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null)
      url.searchParams.set(key, value);
  });
  return url;
};

const parseBody = async (response, responseType) => {
  if (responseType === "blob")
    return response.blob();
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : response.text();
};

const send = async (method, path, { params, body, responseType, cache } = {}) => {
  // No cookies: auth is the Bearer header, which other sites can't make the browser send
  const headers = { Accept: "application/json" };
  const token = localStorage.getItem("authToken");
  if (token)
    headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData)
    payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), { method, headers, body: payload, cache });
  } catch {
    throw new ApiError("Network error. Check your connection and try again.");
  }

  const data = await parseBody(response, response.ok ? responseType : undefined).catch(() => null);
  if (!response.ok)
    throw new ApiError(data?.message || `Request failed with status ${response.status}`, {
      status: response.status,
      data: typeof data === "object" ? data : { message: data },
      hadToken: Boolean(token),
    });
  return { data, status: response.status, headers: response.headers };
};

// One refresh at a time: requests that fail together all wait for the same new token
let refreshPromise = null;
const refreshAccessToken = () => {
  if (!refreshPromise)
    refreshPromise = send("POST", "/auth/refresh", { body: { refreshToken: localStorage.getItem("refreshToken") } })
      .then(({ data }) => {
        localStorage.setItem("authToken", data.token);
        // The server rotates the refresh token; it is missing when another tab just rotated it
        if (data.refreshToken)
          localStorage.setItem("refreshToken", data.refreshToken);
        return data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
};

// Access tokens last 15 minutes. On a 401, renew once with the refresh token and retry the request.
const request = async (method, path, options) => {
  try {
    return await send(method, path, options);
  } catch (error) {
    const expired = error.response?.status === 401 && error.response.hadToken && path !== "/auth/refresh";
    if (!expired)
      throw error;
    if (localStorage.getItem("refreshToken")) {
      try {
        await refreshAccessToken();
        return await send(method, path, options);
      } catch (retryError) {
        if (retryError.response?.status !== 401)
          throw retryError;
      }
    }
    // The session was logged out, revoked or expired, so the user has to log in again
    clearAllUserData();
    throw error;
  }
};

const api = {
  get: (path, options) => request("GET", path, options),
  post: (path, body, options) => request("POST", path, { ...options, body }),
  put: (path, body, options) => request("PUT", path, { ...options, body }),
  patch: (path, body, options) => request("PATCH", path, { ...options, body }),
  delete: (path, options) => request("DELETE", path, options),
};

// --- AUTH ---

const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

// Google OAuth is a full-page redirect. Only this tab keeps the verifier; the server sees its hash,
// so a login code sent to another browser can't be redeemed there.
api.googleLogin = async () => {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  sessionStorage.setItem("googleAuthVerifier", verifier);
  window.location.href = `${API_ROOT}/googleAuth/login?challenge=${toBase64Url(new Uint8Array(digest))}`;
};
api.exchangeGoogleCode = (code, verifier) => api.post("/googleAuth/token", { code, verifier });
api.sendSignupOtp = (email) => api.post("/auth/otp", { email });
api.verifySignupOtp = (email, otp) => api.post("/auth/otp/verify", { email, otp });
api.signUp = (signupData) => api.post("/auth/signup", signupData);
api.login = (loginData) => api.post("/auth/login", loginData);
// Returns the user for the stored token (local and Google logins use the same JWT)
api.verifyAuth = () => api.get("/auth/me");
// Revokes this device's session on the server; the access token stops working immediately
api.logout = () => api.post("/auth/logout", { refreshToken: localStorage.getItem("refreshToken") });
api.demoLogin = (role) => api.post("/auth/demo-login", { role });

// --- PRODUCTS ---

api.getProducts = (productConstraints) =>
  api.get("/products", { params: { productConstraints: JSON.stringify(productConstraints) } });
// The dashboard must see its own edits at once, so it skips the browser's 30-second copy
api.getAdminProducts = (productConstraints) =>
  api.get("/products", { params: { productConstraints: JSON.stringify(productConstraints) }, cache: "no-cache" });
api.getProduct = (productId) => api.get(`/products/${encodeURIComponent(productId)}`);
api.createProduct = (productData) => api.post("/products", productData);
api.updateProduct = (productId, productData) => api.put(`/products/${productId}`, productData);
api.deleteProduct = (productId) => api.delete(`/products/${productId}`);

// --- ORDERS ---

// The server identifies the user from the auth token, so no user info is sent
api.placeOrder = (couponCode, deliveryAddress, paymentMethod) =>
  api.post("/orders", { couponCode, deliveryAddress, paymentMethod });
api.getOrderHistory = (currPage) => api.get("/orders/me", { params: { currPage } });
api.getAllOrdersList = (currPage) => api.get("/orders", { params: { currPage } });
api.getOrderStats = () => api.get("/orders/stats");
api.updateOrder = (orderId, orderData) => api.patch(`/orders/${orderId}`, orderData);
api.deleteOrder = (orderId) => api.delete(`/orders/${orderId}`);

// --- USERS ---

api.getUsers = (currPage, searchQuery, role) => api.get("/users", { params: { currPage, searchQuery, role } });
api.updateUser = (userId, userData) => {
  const formData = new FormData();
  Object.entries(userData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      formData.append(key, value);
  });
  return api.patch(`/users/${userId}`, formData);
};
api.deleteUser = (userId) => api.delete(`/users/${userId}`);

// --- COUPONS ---

api.verifyCouponCode = (couponCode) => api.get("/coupons/eligibility", { params: { code: couponCode } });
api.getAllCoupons = (currPage) => api.get("/coupons", { params: { currPage } });
api.getCouponStats = () => api.get("/coupons/stats");
api.createCoupon = (couponData) => api.post("/coupons", couponData);
api.updateCoupon = (couponId, couponData) => api.patch(`/coupons/${couponId}`, couponData);
api.deleteCoupon = (couponId) => api.delete(`/coupons/${couponId}`);

// --- EXPORT ---

api.exportData = (dataType, format) => api.get(`/exports/${dataType}`, { params: { format }, responseType: "blob" });

// --- CART ---

api.getCart = () => api.get("/cart");
// Adding an item to the cart reserves its stock
api.reserveStock = (productId, variant, quantity) => api.post("/cart/items", { productId, variant, quantity: Number(quantity) });
api.updateCartItem = (productId, variant, newQuantity) =>
  api.patch(`/cart/items/${productId}`, { variant, quantity: Number(newQuantity) });
api.clearCart = () => api.delete("/cart");

// --- CHECKOUT ---

api.createCheckOutSession = (paymentData) => api.post("/checkout-sessions", { paymentData });
// Has the Stripe webhook created the order for this checkout session yet?
api.verifyOrder = (stripeSessionID) => api.get(`/checkout-sessions/${encodeURIComponent(stripeSessionID)}/order`);

export default api;
