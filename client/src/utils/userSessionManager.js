// User Session Manager
// Handles localStorage cleanup when user email changes

const USER_EMAIL_KEY = "currentUserEmail";

// Get the currently stored user email
export const getCurrentUserEmail = () => {
  return localStorage.getItem(USER_EMAIL_KEY);
};

// Set the current user email
export const setCurrentUserEmail = (email) => {
  localStorage.setItem(USER_EMAIL_KEY, email);
};

// Clear all localStorage data except authentication tokens
export const clearUserData = () => {
  // Items to preserve during user switch
  const itemsToPreserve = [
    "userInfo", // Keep new user info
    "token", // Keep authentication token
    "refreshToken", // Keep refresh token if exists
    USER_EMAIL_KEY, // Keep the new email reference
  ];

  // Get all localStorage keys
  const allKeys = Object.keys(localStorage);

  // Remove all items except preserved ones
  allKeys.forEach((key) => {
    if (!itemsToPreserve.includes(key)) {
      localStorage.removeItem(key);
    }
  });

  console.log("User data cleared from localStorage due to email change");
};

// Check if user email has changed and clear data if needed
// Call this function whenever userInfo is updated

export const checkAndHandleUserChange = (newUserInfo) => {
  if (!newUserInfo || !newUserInfo.email) {
    return false; // No valid user info provided
  }

  const currentStoredEmail = getCurrentUserEmail();
  const newEmail = newUserInfo.email;

  // If this is the first time or email hasn't changed, just update the stored email
  if (!currentStoredEmail || currentStoredEmail === newEmail) {
    setCurrentUserEmail(newEmail);
    return false; // No cleanup needed
  }

  // Email has changed - clear user data and update email
  console.log(`User email changed from ${currentStoredEmail} to ${newEmail}`);
  clearUserData();
  setCurrentUserEmail(newEmail);

  return true; // Cleanup was performed
};

// Initialize user session on app start
// Call this when the app loads to sync stored email with current userInfo
export const initializeUserSession = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo && userInfo.email) {
      checkAndHandleUserChange(userInfo);
    }
  } catch (error) {
    console.error("Error initializing user session:", error);
  }
};

// Clear all user data on logout
export const clearAllUserData = () => {
  localStorage.clear();
  console.log("All localStorage data cleared on logout");
};
