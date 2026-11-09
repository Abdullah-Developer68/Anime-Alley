import { useFormContext } from "react-hook-form";

// Validation message for one field, read straight from the form context
// eslint-disable-next-line react/prop-types
const FieldError = ({ name }) => {
  const {
    formState: { errors },
  } = useFormContext();
  const message = errors[name]?.message;

  return message ? <span className="block mt-1 text-xs text-red-500">{message}</span> : null;
};

export default FieldError;
