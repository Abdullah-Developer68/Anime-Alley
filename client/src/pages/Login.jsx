import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Lock, Mail } from "lucide-react";
import useAuth from "../Hooks/UseAuth";
import api from "../api/api";
import { checkAndHandleUserChange, saveAuthTokens } from "../utils/userSessionManager";
import AuthLayout from "../components/Auth/AuthLayout";
import AuthField from "../components/Auth/AuthField";
import DemoAccess from "../components/Auth/DemoAccess";
import { GoogleSignIn, SubmitButton } from "../components/Auth/AuthButtons";

const Login = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const localLogin = async (data) => {
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
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to check out faster and track your orders."
      brandTitle="Your anime gear, all in one place."
      brandText="Comics, figures, apparel and sneakers from the series you love, shipped to your door."
    >
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
        <SubmitButton loading={isSubmitting} loadingText="Logging in...">
          Log in
        </SubmitButton>
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
