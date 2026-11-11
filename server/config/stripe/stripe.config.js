// One Stripe client, created on first use: most requests never talk to Stripe
let stripe = null;

const getStripe = () => {
  if (!stripe)
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return stripe;
};

module.exports = { getStripe };
