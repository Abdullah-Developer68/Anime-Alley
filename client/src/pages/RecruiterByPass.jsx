import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/api";
import useAuth from "../Hooks/UseAuth";
import { checkAndHandleUserChange } from "../utils/userSessionManager";

const RecruiterByPass = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const password = watch("password");

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.recruiterBypass(data);

      if (res.data.success) {
        console.log("Recruiter account created successfully:", res.data);

        // Check if user email has changed and clear localStorage if needed
        const wasCleared = checkAndHandleUserChange(res.data.user);
        if (!wasCleared) {
          // Only clear if user didn't change (to avoid double clearing)
          localStorage.clear();
        }

        // Store token in localStorage for Authorization header
        if (res.data.token) {
          localStorage.setItem("authToken", res.data.token);
          console.log("Token stored successfully");
        }

        // Store user info
        setUser(res.data.user);
        localStorage.setItem("userInfo", JSON.stringify(res.data.user));

        toast.success(
          "Recruiter account created successfully! Redirecting to home..."
        );

        // Add a small delay to ensure toast is visible before redirect
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        console.error("Account creation failed:", res.data);
        toast.error(res.data.message || "Failed to create recruiter account");
      }
    } catch (error) {
      console.error("Recruiter bypass error:", error);

      // Check if the error response indicates success despite the error
      if (error.response?.data?.success) {
        console.log(
          "Account created despite error, proceeding with success flow"
        );

        // Handle success case even if there was an error
        if (error.response.data.user && error.response.data.token) {
          const wasCleared = checkAndHandleUserChange(error.response.data.user);
          if (!wasCleared) {
            localStorage.clear();
          }

          localStorage.setItem("authToken", error.response.data.token);
          setUser(error.response.data.user);
          localStorage.setItem(
            "userInfo",
            JSON.stringify(error.response.data.user)
          );

          toast.success(
            "Recruiter account created successfully! Redirecting to home..."
          );
          setTimeout(() => {
            navigate("/");
          }, 1500);
          return;
        }
      }

      // Handle actual errors
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An error occurred while creating the account!";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 mt-10">
      <div className="w-full max-w-6xl p-4 sm:p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl">
        {/* Mobile Header - Only visible on mobile */}
        <h2 className="text-2xl font-bold mb-6 text-center text-white/90 lg:hidden">
          Recruiter Access
        </h2>

        {/* Main Content Container - Responsive Layout */}
        <div className="flex flex-col lg:flex-row lg:gap-8 lg:items-start">
          {/* Left Side - Info Panel (Desktop) / Top (Mobile) */}
          <div className="lg:w-2/5 lg:pr-4 mb-6 lg:mb-0">
            {/* Desktop Header - Only visible on desktop */}
            <h2 className="hidden lg:block text-3xl font-bold mb-6 text-white/90">
              Recruiter Access
            </h2>

            {/* Back to Login/Signup Links */}
            <div className="mb-4 flex justify-center lg:justify-start gap-4">
              <Link
                to="/login"
                className="text-xs sm:text-sm text-white/60 hover:text-white/80 transition-colors"
              >
                ← Back to Login
              </Link>
              <Link
                to="/signup"
                className="text-xs sm:text-sm text-white/60 hover:text-white/80 transition-colors"
              >
                ← Back to Signup
              </Link>
            </div>

            {/* Info Banners */}
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-300/80">
                  <span className="font-medium text-yellow-400">
                    For Recruiters:
                  </span>{" "}
                  This will create an admin account for recruitment purposes
                </p>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300/80">
                  <span className="font-medium text-blue-400">Note:</span> These
                  are dummy accounts - no need to use real email addresses. Use
                  any test credentials for recruitment demonstrations.
                </p>
              </div>

              {/* Additional Info Panel for Desktop */}
              <div className="hidden lg:block p-4 bg-white/5 border border-white/10 rounded-lg">
                <h3 className="text-lg font-semibold text-white/90 mb-3">
                  Admin Features
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  Recruiter accounts get instant admin access with full
                  privileges.
                </p>
                <ul className="text-xs text-white/60 space-y-2">
                  <li>• Full administrative dashboard access</li>
                  <li>• User management capabilities</li>
                  <li>• Content moderation tools</li>
                  <li>• Analytics and reporting features</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Side - Form Panel */}
          <div className="lg:w-3/5 lg:pl-4">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5 sm:space-y-7"
            >
              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-white/70 mb-2 text-sm font-medium">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 sm:px-5 sm:py-4 rounded-lg bg-white/10 border border-white/20 text-white text-sm sm:text-base placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/15 transition-all duration-300"
                  placeholder="Enter username (e.g., recruiter123)"
                  {...register("username", {
                    required: "Username is required!",
                    minLength: {
                      value: 3,
                      message: "Username must be at least 3 characters long!",
                    },
                    maxLength: {
                      value: 20,
                      message: "Username must be less than 20 characters!",
                    },
                  })}
                />
                {errors.username && (
                  <span className="text-pink-500 text-xs sm:text-sm mt-2 block">
                    {errors.username.message}
                  </span>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-white/70 mb-2 text-sm font-medium">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 sm:px-5 sm:py-4 rounded-lg bg-white/10 border border-white/20 text-white text-sm sm:text-base placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/15 transition-all duration-300"
                  placeholder="Enter test email (e.g., recruiter@test.com)"
                  {...register("email", {
                    required: "Email is required!",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address!",
                    },
                  })}
                />
                {errors.email && (
                  <span className="text-pink-500 text-xs sm:text-sm mt-2 block">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-white/70 mb-2 text-sm font-medium">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 sm:px-5 sm:py-4 rounded-lg bg-white/10 border border-white/20 text-white text-sm sm:text-base placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/15 transition-all duration-300"
                  placeholder="Enter password (min 8 characters)"
                  {...register("password", {
                    required: "Password is required!",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters long!",
                    },
                  })}
                />
                {errors.password && (
                  <span className="text-pink-500 text-xs sm:text-sm mt-2 block">
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="block text-white/70 mb-2 text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 sm:px-5 sm:py-4 rounded-lg bg-white/10 border border-white/20 text-white text-sm sm:text-base placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/15 transition-all duration-300"
                  placeholder="Confirm your password"
                  {...register("confirmPassword", {
                    required: "Please confirm your password!",
                    validate: (value) =>
                      value === password || "Passwords do not match!",
                  })}
                />
                {errors.confirmPassword && (
                  <span className="text-pink-500 text-xs sm:text-sm mt-2 block">
                    {errors.confirmPassword.message}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-4 rounded-lg bg-pink-500 text-black font-semibold hover:bg-pink-400 disabled:bg-pink-500/50 disabled:cursor-not-allowed transition-all duration-300 text-sm sm:text-base mt-2"
              >
                {loading ? "Creating Account..." : "Create Recruiter Account"}
              </button>
            </form>

            {/* Footer Info */}
            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-white/40 text-xs sm:text-sm">
                This will create an admin account instantly for recruitment
                demonstrations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterByPass;
