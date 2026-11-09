import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../Hooks/UseAuth";
import { toast } from "react-toastify";
import api from "../api/api";
import { checkAndHandleUserChange, saveAuthTokens } from "../utils/userSessionManager";

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasProcessed.current) return;
    const handleGoogleAuthSuccess = async () => {
      try {
        hasProcessed.current = true; // Mark as processed

        // The server sends a one-time code in the URL fragment, never the JWT itself
        const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
        // Remove the code from the address bar and browser history straight away
        window.history.replaceState(window.history.state, "", window.location.pathname);

        const verifier = sessionStorage.getItem("googleAuthVerifier");
        sessionStorage.removeItem("googleAuthVerifier");
        if (!code || !verifier)
          throw new Error("Google login was not started from this tab");

        const { data } = await api.exchangeGoogleCode(code, verifier);
        if (!data?.token || !data?.refreshToken)
          throw new Error("No token returned from Google login");

        saveAuthTokens(data);

        // Verify the token and get user data
        const res = await api.verifyAuth();

        if (res.data.success) {
          // Check if user email has changed and clear localStorage if needed
          const wasCleared = checkAndHandleUserChange(res.data.user);
          if (!wasCleared) {
            // Only clear if user didn't change (to avoid double clearing)
            localStorage.clear();
          }

          // Store tokens and user info again after the clear above
          saveAuthTokens(data);
          localStorage.setItem("userInfo", JSON.stringify(res.data.user));

          setUser(res.data.user);
          toast.success("Successfully logged in with Google!");
          navigate("/");
        } else
          throw new Error("Failed to verify token");
      } catch (error) {
        console.error("Google auth success error:", error);
        toast.error("Google authentication failed. Please try again.");
        navigate("/login");
      }
    };

    handleGoogleAuthSuccess();
  }, [setUser, navigate]);

  return (
    <div className="flex items-center justify-center w-full h-screen bg-transparent">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"></div>
        <p className="text-lg text-gray-600">
          Completing Google authentication...
        </p>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
