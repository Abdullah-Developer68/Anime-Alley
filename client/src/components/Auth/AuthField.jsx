import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cx, inputClass, labelClass } from "../ui/styles";

// Labeled input with a leading icon; password fields get a show/hide toggle.
// register() props, including `ref` (a normal prop in React 19), go straight to the <input>.
const AuthField = ({ id, label, icon: Icon, error, hint, trailing, type = "text", inputClassName = "", ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {trailing}
      </div>

      <div className="relative">
        {Icon && <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />}
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
          className={cx(inputClass, "h-11!", Icon && "pl-9!", isPassword && "pr-11!", inputClassName)}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
};

export default AuthField;
