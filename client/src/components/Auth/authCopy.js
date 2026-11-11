// Text for the auth pages, picked by the auth slice's mode and step so components need no props
const AUTH_COPY = {
  login: {
    title: "Welcome back",
    brandTitle: "Your shelf",
    brandText: "missed you.",
    google: "Continue with Google",
    steps: {
      1: { subtitle: "Log in to check out faster and track your orders.", submit: "Log in", submitting: "Logging in..." },
    },
  },
  signup: {
    title: "Create your account",
    brandTitle: "Join the alley.",
    brandText: "Your collection starts here.",
    google: "Sign up with Google",
    steps: {
      1: { subtitle: "Start with your email and we'll send you a 6-digit code.", submit: "Continue", submitting: "Sending code..." },
      2: { subtitle: "Enter the code we just emailed you.", submit: "Verify code", submitting: "Verifying..." },
      3: { subtitle: "Almost done. Pick a username and password.", submit: "Create account", submitting: "Creating account..." },
    },
  },
};

export const selectAuthCopy = ({ auth }) => {
  const page = AUTH_COPY[auth.mode];
  return { ...page, ...(page.steps[auth.step] || page.steps[1]) };
};
