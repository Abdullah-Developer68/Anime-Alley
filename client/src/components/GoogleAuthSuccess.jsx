import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/api";
import useAuth from "../Hooks/UseAuth";
import { saveAuthTokens, startUserSession } from "../utils/userSessionManager";
import Spinner from "./ui/Spinner";

// Google redirects here with a one-time code in the URL fragment, never the JWT itself
const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in development; the code may only be redeemed once
    if (hasProcessed.current)
      return;
    hasProcessed.current = true;

    const complete = async () => {
      try {
        const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
        // Remove the code from the address bar and browser history straight away
        window.history.replaceState(window.history.state, "", window.location.pathname);

        const verifier = sessionStorage.getItem("googleAuthVerifier");
        sessionStorage.removeItem("googleAuthVerifier");
        if (!code || !verifier)
          throw new Error("Google login was not started from this tab");

        const { data } = await api.exchangeGoogleCode(code, verifier);
        saveAuthTokens(data);
        const res = await api.verifyAuth();
        startUserSession(res.data.user, data);
        setUser(res.data.user);
        toast.success(`Welcome, ${res.data.user.username}.`);
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Google auth error:", error);
        toast.error("Google sign-in didn't complete. Please try again.");
        navigate("/login", { replace: true });
      }
    };
    complete();
  }, [setUser, navigate]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-sm text-muted">
      <Spinner />
      Signing you in with Google…
    </div>
  );
};

export default GoogleAuthSuccess;
