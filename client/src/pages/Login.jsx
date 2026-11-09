import { useLayoutEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Lock, Mail } from "lucide-react";
import useAuth from "../Hooks/UseAuth";
import { setAuthLoading, setAuthMode } from "../redux/Slice/authSlice";
import api from "../api/api";
import { checkAndHandleUserChange, saveAuthTokens } from "../utils/userSessionManager";
import AuthLayout from "../components/Auth/AuthLayout";
import AuthField from "../components/Auth/AuthField";
import DemoAccess from "../components/Auth/DemoAccess";
import { GoogleSignIn, SubmitButton } from "../components/Auth/AuthButtons";

const Login = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Before paint, so the layout never shows the signup text
  useLayoutEffect(() => {
    dispatch(setAuthMode("login"));
  }, [dispatch]);

  const localLogin = async (data) => {
    dispatch(setAuthLoading(true));
    try {
      const res = await api.login(data);

      if (res.data.success) {
        // Only clear if the user didn't change, to avoid clearing twice
        if (!checkAndHandleUserChange(res.data.user))
          localStorage.clear();

        // Access token for the Authorization header, refresh token to renew it
        saveAuthTokens(res.data);

        setUser(res.data.user);
        localStorage.setItem("userInfo", JSON.stringify(res.data.user));
        navigate("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Try again something went wrong!");
      console.error("Login error:", {
        message: error.response?.data?.message,
        status: error.response?.status,
      });
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  return (
    <AuthLayout>
      <GoogleSignIn />

      <form onSubmit={handleSubmit(localLogin)} className="space-y-5" noValidate>
        <AuthField
          id="login-email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email", { required: "Email is required" })}
        />
        <AuthField
          id="login-password"
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          {...register("password", { required: "Password is required" })}
        />
        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        New to Anime Alley?{" "}
        <Link to="/signup" className="font-semibold text-pink-400 transition hover:text-pink-300">
          Create an account
        </Link>
      </p>

      <DemoAccess />
    </AuthLayout>
  );
};

export default Login;
