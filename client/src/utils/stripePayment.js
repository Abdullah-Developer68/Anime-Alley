import api from "../api/api";

let stripePromise = null;

const getStripe = async () => {
  if (!stripePromise) {
    // import loadStripe dynamically so that it is loaded only the first time it is needed (when the user clicks on the checkout button) and not when the app loads for the first time
    const { loadStripe } = await import("@stripe/stripe-js");
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};
//  paymentData - info from cart.jsx
export const processStripePayment = async (paymentData) => {
  try {
    const stripe = await getStripe();
    // This creates a checkout session on the server and or that provides the required data to start the stripe checkout process
    const res = await api.createCheckOutSession(paymentData);
    const { sessionId } = res.data;
    // After the checkout session is created (in stripe.js (backend)), redirect to stripe checkout page
    await stripe.redirectToCheckout({ sessionId });
  } catch (error) {
    console.error("Error processing Stripe payment:", error);
    throw error;
  }
};
