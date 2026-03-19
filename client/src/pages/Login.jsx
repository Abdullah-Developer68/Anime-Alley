import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../Hooks/UseAuth";
import api from "../api/api";
import { toast } from "react-toastify";
import { checkAndHandleUserChange } from "../utils/userSessionManager";

const Login = () => {
  // using custom hook for auth
  const { setUser } = useAuth();
  // to navigate
  const navigate = useNavigate();
  // form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const localLogin = async (data) => {
    console.log(data);
    try {
      const res = await api.login(data);

      if (res.data.success) {
        // Check if user email has changed and clear localStorage if needed
        const wasCleared = checkAndHandleUserChange(res.data.user);
        if (!wasCleared) {
          // Only clear if user didn't change (to avoid double clearing)
          localStorage.clear();
        }

        // Store token in localStorage for Authorization header
        if (res.data.token) {
          localStorage.setItem("authToken", res.data.token);
        }

        // Store user info
        setUser(res.data.user);
        localStorage.setItem("userInfo", JSON.stringify(res.data.user));
        navigate("/");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Try again something went wrong!",
      );
      console.error("Login error:", {
        message: error.response?.data?.message,
        status: error.response?.status,
      });
    }
  };

  const handleGoogleLogin = async () => {
    api.googleLogin();
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen px-4 py-6 mt-10">
        <div className="w-full max-w-6xl p-4 border shadow-xl sm:p-8 bg-white/5 backdrop-blur-sm rounded-xl border-white/10">
          {/* Mobile Header - Only visible on mobile */}
          <h2 className="mb-6 text-2xl font-bold text-center text-white/90 lg:hidden">
            Log In
          </h2>

          {/* Main Content Container - Responsive Layout */}
          <div className="flex flex-col lg:flex-row lg:gap-8 lg:items-start">
            {/* Left Side - Info Panel (Desktop) / Top (Mobile) */}
            <div className="mb-6 lg:w-2/5 lg:pr-4 lg:mb-0">
              {/* Desktop Header - Only visible on desktop */}
              <h2 className="hidden mb-6 text-3xl font-bold lg:block text-white/90">
                Log In
              </h2>

              {/* Recruiter Access Banner */}
              <div className="p-4 mb-4 border rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <p className="mb-3 text-sm text-purple-300/90">
                  <span className="font-semibold text-purple-400">
                    For Recruiters:
                  </span>{" "}
                  Need admin access?
                </p>
                <Link
                  to="/recruiter"
                  className="block w-full text-center py-2.5 px-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-md text-purple-300 hover:text-purple-200 transition-all duration-300 text-sm font-medium"
                >
                  Create Recruiter Account →
                </Link>
              </div>

              {/* Additional Info Panel for Desktop */}
              <div className="hidden p-4 border rounded-lg lg:block bg-white/5 border-white/10">
                <h3 className="mb-3 text-lg font-semibold text-white/90">
                  Welcome Back!
                </h3>
                <p className="mb-4 text-sm text-white/70">
                  Sign in to access your account and continue your anime
                  journey.
                </p>
                <ul className="space-y-2 text-xs text-white/60">
                  <li>• Access your personalized dashboard</li>
                  <li>• Manage your anime collection</li>
                  <li>• Connect with the community</li>
                </ul>
              </div>
            </div>

            {/* Right Side - Form Panel */}
            <div className="lg:w-3/5 lg:pl-4">
              <form
                onSubmit={handleSubmit(localLogin)}
                className="space-y-5 sm:space-y-7"
              >
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block mb-2 text-sm font-medium text-white/70">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 text-sm text-white transition-all duration-300 border rounded-lg sm:px-5 sm:py-4 bg-white/10 border-white/20 sm:text-base placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/15"
                    placeholder="Enter your email address"
                    {...register("email", { required: "Email is required!" })}
                  />
                  {errors.email && (
                    <span className="block mt-2 text-xs text-pink-500 sm:text-sm">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-white/70">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-pink-500 transition-colors sm:text-sm hover:text-pink-400"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    className="w-full px-4 py-3 text-sm text-white transition-all duration-300 border rounded-lg sm:px-5 sm:py-4 bg-white/10 border-white/20 sm:text-base placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/15"
                    placeholder="Enter your password"
                    {...register("password", {
                      required: "Password is required!",
                    })}
                  />
                  {errors.password && (
                    <span className="block mt-2 text-xs text-pink-500 sm:text-sm">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  className="w-full py-3 mt-2 text-sm font-semibold text-black transition-all duration-300 bg-pink-500 rounded-lg cursor-pointer sm:py-4 sm:text-base hover:shadow-lg hover:shadow-pink-500/25 hover:bg-pink-400"
                >
                  Login
                </button>
              </form>

              {/* Divider */}
              <div className="relative mt-8 mb-6 sm:mt-10 sm:mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-4 text-white/40 bg-gradient-to-b from-[#0b0133] to-[#1a0266]">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center w-full gap-3 py-3 text-sm text-white transition-all duration-300 border rounded-lg cursor-pointer sm:py-4 bg-white/10 border-white/20 sm:text-base hover:bg-white/20"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.30-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                Continue with Google
              </button>

              {/* Sign Up Link */}
              <div className="mt-6 space-y-3 text-center sm:mt-8">
                <p className="text-xs text-white/40 sm:text-sm">
                  Do not have an account?{" "}
                  <Link
                    to="/signup"
                    className="font-medium text-pink-500 transition-colors hover:text-pink-400"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
