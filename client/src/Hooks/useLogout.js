import { useCallback } from "react";
import { toast } from "react-toastify";
import api from "../api/api";
import { clearAllUserData } from "../utils/userSessionManager";

// Revokes this device's session on the server, clears the person's stored data, and reloads on the
// login page, which also empties the in-memory cart and history of whoever was signed in
const useLogout = () =>
  useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Could not reach the server; you are logged out on this device only.");
    }
    clearAllUserData();
    window.location.assign("/login");
  }, []);

export default useLogout;
