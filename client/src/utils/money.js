import { formatPrice } from "./formatPrice";

// "$12.50": prices show the currency in front everywhere
export const formatMoney = (value) => `$${formatPrice(value, { asString: true })}`;

export const formatDate = (value, options = { year: "numeric", month: "short", day: "numeric" }) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", options);
};
