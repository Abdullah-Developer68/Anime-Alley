import { Link } from "react-router-dom";
import { buttonClass } from "./styles";

// Pill buttons: primary (ink), secondary (outlined), ghost, danger. Sizes sm, md, lg, icon, icon-sm.
const Button = ({ variant, size, className, type = "button", ...props }) => (
  <button type={type} className={buttonClass({ variant, size, className })} {...props} />
);

// A router link that looks like a button
export const ButtonLink = ({ variant, size, className, ...props }) => (
  <Link className={buttonClass({ variant, size, className })} {...props} />
);

export default Button;
