// Everything stored for the signed-in person. The shop's own cache (category, filters, product
// pages) is not personal, so it survives logouts and keeps the shop instant.
const USER_DATA_KEYS = [
  "authToken",
  "refreshToken",
  "userInfo",
  "currentUserEmail",
  "purchaseHistory",
  "userHistoryTotalPages",
  "deliveryAddress",
];

export const hasStoredSession = () =>
  Boolean(localStorage.getItem("authToken") || localStorage.getItem("refreshToken"));

// Stores the 15-minute access token and the refresh token that renews it (see api.js)
export const saveAuthTokens = ({ token, refreshToken } = {}) => {
  if (token)
    localStorage.setItem("authToken", token);
  if (refreshToken)
    localStorage.setItem("refreshToken", refreshToken);
};

export const clearAllUserData = () => {
  USER_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
};

// After any login: drop the previous person's data, then keep the new tokens and profile
export const startUserSession = (user, tokens) => {
  clearAllUserData();
  saveAuthTokens(tokens);
  localStorage.setItem("userInfo", JSON.stringify(user));
  localStorage.setItem("currentUserEmail", user.email);
};

export const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo"));
  } catch {
    return null;
  }
};
