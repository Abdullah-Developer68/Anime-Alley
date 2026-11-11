import api from "../api/api";

// The server creates the Checkout Session and returns Stripe's hosted page URL, so the browser
// never has to download Stripe.js just to redirect
export const processStripePayment = async (paymentData) => {
  const res = await api.createCheckOutSession(paymentData);
  const { url } = res.data || {};
  if (typeof url !== "string" || !url.startsWith("https://checkout.stripe.com/"))
    throw new Error("Checkout could not be started. Please try again.");
  window.location.assign(url);
};
