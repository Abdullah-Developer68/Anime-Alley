import api from "../api/api";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

//  paymentData - info from cart.jsx
export const processStripePayment = async (paymentData) => {
  try {
    const stripe = await stripePromise;

    const res = await api.createCheckOutSession(paymentData);

    const { sessionId } = res.data;
    await stripe.redirectToCheckout({ sessionId });
  } catch (error) {
    console.error("Error processing Stripe payment:", error);
    throw error;
  }
};
