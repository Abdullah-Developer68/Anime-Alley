import { useLayoutEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Lock, Mail } from "lucide-react";
import useAuth from "../Hooks/UseAuth";
import { setAuthLoading, setAuthMode } from "../redux/Slice/authSlice";
import api from "../api/api";
import { startUserSession } from "../utils/userSessionManager";
import AuthLayout from "../components/Auth/AuthLayout";
import AuthField from "../components/Auth/AuthField";
import DemoAccess from "../components/Auth/DemoAccess";
import { GoogleSignIn, SubmitButton } from "../components/Auth/AuthButtons";

const Login = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

      // Access token for the Authorization header, refresh token to renew it
      startUserSession(res.data.user, res.data);
      setUser(res.data.user);
      // Back to the page that asked for a login, if any
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
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

      <p className="mt-6 text-center text-sm text-muted">
        New to Anime Alley?{" "}
        <Link to="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      <DemoAccess />
    </AuthLayout>
  );
};

export default Login;
