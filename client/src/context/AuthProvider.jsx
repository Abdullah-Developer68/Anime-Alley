import { createContext, useEffect, useState } from "react";
import api from "../api/api";
import { clearAllUserData, hasStoredSession, readStoredUser } from "../utils/userSessionManager";

const AuthContext = createContext();

// Signed-in user for the whole app. Starts from the stored profile so the first paint is right,
// then confirms it with the server. Visitors without tokens never call the server at all.
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => (hasStoredSession() ? readStoredUser() : null));
  const [loading, setLoading] = useState(hasStoredSession);

  const setUserAndStorage = (userData) => {
    if (userData) {
      setUser(userData);
      localStorage.setItem("userInfo", JSON.stringify(userData));
      return;
    }
    setUser(null);
    clearAllUserData();
  };

  useEffect(() => {
    if (!hasStoredSession())
      return;
    let active = true;
    api
      .verifyAuth()
      .then((res) => {
        if (!active || !res.data.success)
          return;
        setUser(res.data.user);
        localStorage.setItem("userInfo", JSON.stringify(res.data.user));
      })
      .catch((error) => {
        if (!active)
          return;
        if (error.response?.status !== 401)
          console.error("Auth check error:", error);
        // Only a rejected session logs the person out; a network blip keeps the stored profile
        if (error.response?.status === 401) {
          setUser(null);
          clearAllUserData();
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return <AuthContext value={{ user, setUser: setUserAndStorage, loading }}>{children}</AuthContext>;
};

export { AuthProvider, AuthContext };
