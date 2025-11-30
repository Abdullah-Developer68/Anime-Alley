import { useForm } from "react-hook-form";
import assests from "../assets/asset";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import useAuth from "../Hooks/UseAuth";
import { Link } from "react-router-dom";
import { useState } from "react";
import { checkAndHandleUserChange } from "../utils/userSessionManager";

const Signup = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Step state: 1 = email, 2 = otp, 3 = username/password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 1: Email form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm();

  // Step 2: OTP form
  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: otpErrors },
  } = useForm();

  // Step 3: Username/password form
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
  } = useForm();

  // Handle sending OTP (Step 1 and resend)
  const sendOtp = async (data) => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/send-otp", { email: data.email || email });
      setEmail(data.email || email);
      setStep(2);
      setResendCooldown(30); // 30s cooldown
      // Start cooldown timer
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle verifying OTP (Step 2)
  const verifyOtp = async (data) => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/verify-otp", { email, otp: data.otp });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle final signup (Step 3)
  const onSignup = async (data) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", { email, ...data });
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
      } else {
        setError(res.data.message || "Signup failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    api.googleLogin();
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center px-4 py-6 mt-10">
        <div className="w-full max-w-6xl p-4 sm:p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl">
          {/* Mobile Header - Only visible on mobile */}
          <h2 className="text-2xl font-bold mb-6 text-center text-white/90 lg:hidden">
            Sign Up
          </h2>

          {/* Main Content Container - Responsive Layout */}
          <div className="flex flex-col lg:flex-row lg:gap-8 lg:items-start">
            {/* Left Side - Info Panel (Desktop) / Top (Mobile) */}
            <div className="lg:w-2/5 lg:pr-4 mb-6 lg:mb-0">
              {/* Desktop Header - Only visible on desktop */}
              <h2 className="hidden lg:block text-3xl font-bold mb-6 text-white/90">
                Sign Up
              </h2>

              {/* Recruiter Access Banner */}
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-sm text-purple-300/90 mb-3">
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
              <div className="hidden lg:block p-4 bg-white/5 border border-white/10 rounded-lg">
                <h3 className="text-lg font-semibold text-white/90 mb-3">
                  Join Our Community!
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  Create your account to start your anime adventure with us.
                </p>
                <ul className="text-xs text-white/60 space-y-2">
                  <li>• Build your personal anime collection</li>
                  <li>• Discover new anime recommendations</li>
                  <li>• Connect with fellow anime enthusiasts</li>
                  <li>• Track your watching progress</li>
                </ul>
              </div>
            </div>

            {/* Right Side - Form Panel */}
            <div className="lg:w-3/5 lg:pl-4">
              {/* Step 1: Email */}
              {step === 1 && (
                <form
                  onSubmit={handleSubmitEmail(sendOtp)}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block text-white/70 mb-1.5 text-sm">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
                      placeholder="Enter your email"
                      {...registerEmail("email", {
                        required: "Email is required!",
                      })}
                      disabled={loading}
                    />
                    {emailErrors.email && (
                      <span className="text-pink-500 text-xs sm:text-sm mt-1">
                        {emailErrors.email.message}
                      </span>
                    )}
                  </div>
                  {error && (
                    <div className="text-pink-500 text-sm">{error}</div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2.5 sm:py-3 rounded-lg bg-pink-500 text-black text-sm sm:text-base font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 cursor-pointer"
                    disabled={loading}
                  >
                    {loading ? "Sending OTP..." : "Continue"}
                  </button>
                </form>
              )}

              {/* Step 2: OTP */}
              {step === 2 && (
                <form
                  onSubmit={handleSubmitOtp(verifyOtp)}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block text-white/70 mb-1.5 text-sm">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
                      value={email}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 mb-1.5 text-sm">
                      OTP
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
                      placeholder="Enter OTP"
                      {...registerOtp("otp", { required: "OTP is required!" })}
                      disabled={loading}
                    />
                    {otpErrors.otp && (
                      <span className="text-pink-500 text-xs sm:text-sm mt-1">
                        {otpErrors.otp.message}
                      </span>
                    )}
                  </div>
                  {error && (
                    <div className="text-pink-500 text-sm">{error}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 sm:py-3 rounded-lg bg-pink-500 text-black text-sm sm:text-base font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 cursor-pointer"
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2.5 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm sm:text-base hover:bg-white/20 transition-all duration-300 cursor-pointer"
                      onClick={() => sendOtp({ email })}
                      disabled={resendCooldown > 0}
                    >
                      {resendCooldown > 0
                        ? `Resend OTP (${resendCooldown}s)`
                        : "Resend OTP"}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Username/Password */}
              {step === 3 && (
                <form
                  onSubmit={handleSubmitSignup(onSignup)}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block text-white/70 mb-1.5 text-sm">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
                      value={email}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 mb-1.5 text-sm">
                      Username
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
                      placeholder="Enter your username"
                      {...registerSignup("username", {
                        required: "Username is required!",
                      })}
                      disabled={loading}
                    />
                    {signupErrors.username && (
                      <span className="text-pink-500 text-xs sm:text-sm mt-1">
                        {signupErrors.username.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/70 mb-1.5 text-sm">
                      Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 transition-colors"
                      placeholder="Enter your password"
                      {...registerSignup("password", {
                        required: "Password is required!",
                        minLength: {
                          value: 8,
                          message: "Password must be at least 8 characters.",
                        },
                      })}
                      disabled={loading}
                    />
                    {signupErrors.password && (
                      <span className="text-pink-500 text-xs sm:text-sm mt-1">
                        {signupErrors.password.message}
                      </span>
                    )}
                  </div>
                  {error && (
                    <div className="text-pink-500 text-sm">{error}</div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2.5 sm:py-3 rounded-lg bg-pink-500 text-black text-sm sm:text-base font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 cursor-pointer"
                    disabled={loading}
                  >
                    {loading ? "Signing Up..." : "Sign Up"}
                  </button>
                </form>
              )}

              {/* Divider - Reduced margins */}
              <div className="relative mt-6 mb-4 sm:mt-8 sm:mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-4 text-white/40 bg-gradient-to-b from-[#0b0133] to-[#1a0266]">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google Button */}
              <button
                className="w-full py-2.5 sm:py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm sm:text-base hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleGoogleLogin}
              >
                <img src={assests.google} className="w-6" />
                Sign Up with Google
              </button>

              {/* Login Link - Reduced margin and text size */}
              <p className="mt-4 sm:mt-6 text-center text-white/40 text-xs sm:text-sm">
                Already have an account?{" "}
                <a href="/login" className="text-pink-500 hover:text-pink-400">
                  Log In
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
