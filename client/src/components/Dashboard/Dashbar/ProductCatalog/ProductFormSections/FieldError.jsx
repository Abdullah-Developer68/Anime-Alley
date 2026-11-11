import { useFormContext } from "react-hook-form";
import { CircleAlert } from "lucide-react";

// Validation message for one field, read straight from the form context
// eslint-disable-next-line react/prop-types
const FieldError = ({ name }) => {
  const {
    formState: { errors },
  } = useFormContext();
  const message = errors[name]?.message;

  return message ? (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-300">
      <CircleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  ) : null;
};

export default FieldError;
