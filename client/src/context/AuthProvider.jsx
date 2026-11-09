/* eslint-disable react/prop-types */
import { createContext, useEffect, useState } from "react";
import api from "../api/api";
import {
  checkAndHandleUserChange,
  initializeUserSession,
  clearAllUserData,
} from "../utils/userSessionManager";

const AuthContext = createContext();

// Manages authentication state and provides it to all child components
// through React Context. Initializes auth state from localStorage if available.

const AuthProvider = ({ children }) => {
  const userInfo = localStorage.getItem("userInfo");
  const authToken = localStorage.getItem("authToken");
  const [user, setUser] = useState(userInfo ? JSON.parse(userInfo) : null);
  const [loading, setLoading] = useState(true);

  // Helper to set user and localStorage
  const setUserAndStorage = (userData) => {
    if (userData) {
      // Check if user email has changed and clear localStorage if needed
      const wasCleared = checkAndHandleUserChange(userData);
      if (wasCleared) {
        console.log("localStorage cleared due to user email change");
      }

      setUser(userData);
      localStorage.setItem("userInfo", JSON.stringify(userData));
    } else {
      // Clear all data on logout
      setUser(null);
      clearAllUserData();
    }
  };

  // Local and Google logins use the same JWT, so one check covers both
  const checkAuthStatus = async () => {
    try {
      const res = await api.verifyAuth();
      if (res.data.success) {
        setUserAndStorage(res.data.user);
        return;
      }
    } catch (error) {
      if (error.response?.status !== 401)
        console.error("Auth check error:", error);
      setUserAndStorage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize user session to check for email changes
    initializeUserSession();

    // Check auth status if we have user info or auth token in localStorage
    if (userInfo || authToken || loading) {
      checkAuthStatus();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <AuthContext value={{ user, setUser: setUserAndStorage, loading }}>
      {children}
    </AuthContext>
  );
};

export { AuthProvider, AuthContext };
