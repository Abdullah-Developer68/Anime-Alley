// Demo admins see the dashboard with real data shapes but without real customers' personal details
const DOT = "•";

const maskText = (value, keep = 1) => {
  if (typeof value !== "string" || !value)
    return value;
  return value.slice(0, keep) + DOT.repeat(Math.min(Math.max(value.length - keep, 3), 6));
};

// "casey@example.com" -> "c•••@•••.com"
const maskEmail = (email) => {
  if (typeof email !== "string" || !email.includes("@"))
    return maskText(email);
  const [local, domain] = email.split("@");
  const tld = domain.includes(".") ? domain.slice(domain.lastIndexOf(".")) : "";
  return `${local.slice(0, 1)}${DOT.repeat(3)}@${DOT.repeat(3)}${tld}`;
};

const HIDDEN_ADDRESS = "Hidden for demo accounts";

module.exports = { maskText, maskEmail, HIDDEN_ADDRESS };
