import { useFormContext } from "react-hook-form";

// Validation message for one field, read straight from the form context
 
const FieldError = ({ name }) => {
  const {
    formState: { errors },
  } = useFormContext();
  const message = errors[name]?.message;

  return message ? <span role="alert" className="mt-1.5 block text-xs text-danger">{message}</span> : null;
};

export default FieldError;
