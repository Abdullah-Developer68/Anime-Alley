import api from "../api/api";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

//  paymentData - info from cart.jsx
export const processStripePayment = async (paymentData) => {
  try {
    const stripe = await stripePromise;
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
