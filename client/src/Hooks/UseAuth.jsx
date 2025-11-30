import { useContext } from "react";
import { AuthContext } from "../context/AuthProvider";

/**
 * This hook provides a simple way to consume the AuthContext in any component
 * that requires authentication-related data or functions (such as user info, login, and logout).
 *
 * @returns {object} The authentication context value (user data, authentication methods, etc.).
 * @throws {Error} If used outside of an AuthProvider, it throws an error to prevent unintended behavior.
 */

const useAuth = () => {
  // Get the authentication context using useContext
  const context = useContext(AuthContext);

  // Ensure that the hook is used within an AuthProvider to avoid undefined context issues.
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context; // Return the authentication data (user data, authentication methods, etc.) and functions
};

export default useAuth;
