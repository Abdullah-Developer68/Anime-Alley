import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../Hooks/UseAuth";
import { toast } from "react-toastify";
import api from "../api/api";
import { checkAndHandleUserChange } from "../utils/userSessionManager";

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasProcessed.current) return;
    const handleGoogleAuthSuccess = async () => {
      try {
        hasProcessed.current = true; // Mark as processed

        // Get token from URL query parameter
        const token = searchParams.get("token");

        if (token) {
          console.log(
            "Processing token from URL:",
            token.substring(0, 20) + "..."
          );
          // Store token in localStorage
          localStorage.setItem("authToken", token);

          // Verify the token and get user data
          const res = await api.verifyAuth();

          if (res.data.success) {
            // Check if user email has changed and clear localStorage if needed
            const wasCleared = checkAndHandleUserChange(res.data.user);
            if (!wasCleared) {
              // Only clear if user didn't change (to avoid double clearing)
              localStorage.clear();
            }

            // Store token and user info
            localStorage.setItem("authToken", token);
            localStorage.setItem("userInfo", JSON.stringify(res.data.user));

            setUser(res.data.user);
            toast.success("Successfully logged in with Google!");
            navigate("/");
            return; // Ensure we don't continue to the fallback
          } else {
            throw new Error("Failed to verify token");
          }
        } else {
          console.log("No token in URL, trying cookie fallback");
          // Fallback: try to get user data from cookies (existing flow)
          const res = await api.googleAuthSuccess();

          if (res.data.success) {
            // Check if user email has changed and clear localStorage if needed
            const wasCleared = checkAndHandleUserChange(res.data.user);
            if (!wasCleared) {
              // Only clear if user didn't change (to avoid double clearing)
              localStorage.clear();
            }

            localStorage.setItem("userInfo", JSON.stringify(res.data.user));
            setUser(res.data.user);
            toast.success("Successfully logged in with Google!");
            navigate("/");
          } else {
            throw new Error("Google authentication failed");
          }
        }
      } catch (error) {
        console.error("Google auth success error:", error);
        toast.error("Google authentication failed. Please try again.");
        navigate("/login");
      }
    };

    handleGoogleAuthSuccess();
  }, [searchParams, setUser]);

  return (
    <div className="flex items-center justify-center h-screen w-full bg-transparent">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">
          Completing Google authentication...
        </p>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
