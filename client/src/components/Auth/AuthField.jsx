import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Labeled input with a leading icon; password fields get a show/hide toggle.
// register() props, including `ref` (a normal prop in React 19), go straight to the <input>.
// eslint-disable-next-line react/prop-types
const AuthField = ({ id, label, icon: Icon, error, hint, trailing, type = "text", inputClassName = "", ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-300">
          {label}
        </label>
        {trailing}
      </div>

      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          />
        )}
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-lg border bg-white/[0.04] text-sm text-white transition placeholder:text-slate-500 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${Icon ? "pl-10" : "pl-3.5"} ${isPassword ? "pr-11" : "pr-3.5"} ${
            error
              ? "border-rose-500/60 focus:border-rose-500/60 focus:ring-rose-500/20"
              : "border-white/10 hover:border-white/20 focus:border-pink-500/60 focus:ring-pink-500/20"
          } ${inputClassName}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-rose-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
};

export default AuthField;
