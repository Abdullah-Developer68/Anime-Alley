import { useContext } from "react";
import { AuthContext } from "../context/AuthProvider";

const useAuth = () => {
  // Get the authentication context using useContext
  const context = useContext(AuthContext);

  // Ensure that the hook is used within an AuthProvider to avoid undefined context issues.
  if (!context)
    throw new Error("useAuth must be used within an AuthProvider");

  return context; // Return the authentication data (user data, authentication methods, etc.) and functions
};

export default useAuth;
