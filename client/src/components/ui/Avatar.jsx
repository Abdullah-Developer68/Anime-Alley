import { useState } from "react";
import { cx } from "./styles";

// Profile picture, or the first letter of the name when there is none or it fails to load
const Avatar = ({ src, name, className }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  if (src && !failed)
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={cx("size-8 shrink-0 rounded-full object-cover ring-1 ring-line", className)}
      />
    );
  return (
    <span aria-hidden="true" className={cx("flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-[13px] font-medium text-ink-soft ring-1 ring-line", className)}>
      {initial}
    </span>
  );
};

export default Avatar;
