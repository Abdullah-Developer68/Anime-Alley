import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import api from "../../api/api";
import { buttonClass } from "../ui/styles";
import { selectAuthCopy } from "./authCopy";

export const SubmitButton = () => {
  const loading = useSelector((state) => state.auth.loading);
  const { submit, submitting } = useSelector(selectAuthCopy);

  return (
    <button type="submit" disabled={loading} aria-busy={loading} className={buttonClass({ size: "lg", className: "w-full" })}>
      {loading && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
      {loading ? submitting : submit}
    </button>
  );
};

// Errors from the server, shown above the submit button
export const FormAlert = () => {
  const message = useSelector((state) => state.auth.error);

  return message ? (
    <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  ) : null;
};

// Google sign-in plus the divider that leads into the email form
export const GoogleSignIn = () => {
  const { google } = useSelector(selectAuthCopy);

  return (
    <>
      <button type="button" onClick={() => api.googleLogin()} className={buttonClass({ variant: "secondary", size: "lg", className: "w-full" })}>
        <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {google}
      </button>

      <div className="my-6 flex items-center gap-3" role="separator">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-subtle">or with email</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
};
