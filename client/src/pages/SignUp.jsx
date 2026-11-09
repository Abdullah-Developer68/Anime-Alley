import { useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Check, KeyRound, Lock, Mail, User } from "lucide-react";
import api from "../api/api";
import useAuth from "../Hooks/UseAuth";
import { setAuthError, setAuthLoading, setAuthMode, setAuthStep } from "../redux/Slice/authSlice";
import { checkAndHandleUserChange, saveAuthTokens } from "../utils/userSessionManager";
import AuthLayout from "../components/Auth/AuthLayout";
import AuthField from "../components/Auth/AuthField";
import DemoAccess from "../components/Auth/DemoAccess";
import { FormAlert, GoogleSignIn, SubmitButton } from "../components/Auth/AuthButtons";

const STEPS = ["Email", "Verify", "Profile"];

const StepIndicator = () => {
  const step = useSelector((state) => state.auth.step);

  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Signup progress">
      {STEPS.map((name, index) => {
        const number = index + 1;
        const done = number < step;
        const current = number === step;
        return (
          <li key={name} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                done
                  ? "bg-pink-500 text-slate-950"
                  : current
                    ? "border border-pink-400 bg-pink-500/15 text-pink-200"
                    : "border border-white/15 text-slate-500"
              }`}
            >
              {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : number}
            </span>
            <span className={`text-xs font-medium ${current || done ? "text-slate-200" : "text-slate-500"}`}>{name}</span>
            {number < STEPS.length && <span className={`h-px flex-1 ${done ? "bg-pink-500/60" : "bg-white/10"}`} />}
          </li>
        );
      })}
    </ol>
  );
};

const Signup = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Step (1 = email, 2 = otp, 3 = username/password), loading and error live in the auth slice
  const { step, loading } = useSelector((state) => state.auth);
  const setStep = (value) => dispatch(setAuthStep(value));
  const setLoading = (value) => dispatch(setAuthLoading(value));
  const setError = (value) => dispatch(setAuthError(value));

  const [email, setEmail] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Before paint, so the layout never shows the login text or an old signup step
  useLayoutEffect(() => {
    dispatch(setAuthMode("signup"));
  }, [dispatch]);

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm();

  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: otpErrors },
  } = useForm();

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
      await api.sendSignupOtp(data.email || email);
      setEmail(data.email || email);
      setStep(2);
      setResendCooldown(30);
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
      const res = await api.verifySignupOtp(email, data.otp);
      if (res.data.verificationToken)
        setVerificationToken(res.data.verificationToken);
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
      const res = await api.signUp({ email, verificationToken, ...data });
      if (res.data.success) {
        // Only clear if the user didn't change, to avoid clearing twice
        if (!checkAndHandleUserChange(res.data.user))
          localStorage.clear();

        // Access token for the Authorization header, refresh token to renew it
        saveAuthTokens(res.data);

        setUser(res.data.user);
        localStorage.setItem("userInfo", JSON.stringify(res.data.user));
        navigate("/");
      } else
        setError(res.data.message || "Signup failed");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const changeEmail = () => {
    setError("");
    setStep(1);
  };

  // Shown on steps 2 and 3 instead of a disabled email input
  const emailSummary = (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
        <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="truncate">{email}</span>
      </span>
      <button
        type="button"
        onClick={changeEmail}
        className="shrink-0 cursor-pointer text-xs font-semibold text-pink-400 transition hover:text-pink-300"
      >
        Change
      </button>
    </div>
  );

  return (
      <AuthLayout>
        {step === 1 && <GoogleSignIn />}
        <StepIndicator />

        {step === 1 && (
          <form onSubmit={handleSubmitEmail(sendOtp)} className="space-y-5" noValidate>
            <AuthField
              id="signup-email"
              label="Email"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={email}
              disabled={loading}
              error={emailErrors.email?.message}
              {...registerEmail("email", { required: "Email is required" })}
            />
            <FormAlert />
            <SubmitButton />
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmitOtp(verifyOtp)} className="space-y-5" noValidate>
            {emailSummary}
            <AuthField
              id="signup-otp"
              label="Verification code"
              icon={KeyRound}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              inputClassName="tracking-[0.3em] placeholder:tracking-normal"
              disabled={loading}
              error={otpErrors.otp?.message}
              hint="No code? If this email already has an account, no code is sent."
              trailing={
                <button
                  type="button"
                  onClick={() => sendOtp({ email })}
                  disabled={resendCooldown > 0 || loading}
                  className="cursor-pointer text-xs font-semibold text-pink-400 transition hover:text-pink-300 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              }
              {...registerOtp("otp", {
                required: "Enter the code from your email",
                pattern: { value: /^\d{6}$/, message: "The code is 6 digits" },
              })}
            />
            <FormAlert />
            <SubmitButton />
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmitSignup(onSignup)} className="space-y-5" noValidate>
            {emailSummary}
            <AuthField
              id="signup-username"
              label="Username"
              icon={User}
              autoComplete="username"
              placeholder="How should we call you?"
              disabled={loading}
              error={signupErrors.username?.message}
              {...registerSignup("username", { required: "Username is required" })}
            />
            <AuthField
              id="signup-password"
              label="Password"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              disabled={loading}
              hint="8 to 72 characters."
              error={signupErrors.password?.message}
              {...registerSignup("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters." },
                // bcrypt on the server ignores anything past 72 bytes
                maxLength: { value: 72, message: "Password must be at most 72 characters." },
              })}
            />
            <FormAlert />
            <SubmitButton />
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-pink-400 transition hover:text-pink-300">
            Log in
          </Link>
        </p>

        <DemoAccess />
      </AuthLayout>
  );
};

export default Signup;
