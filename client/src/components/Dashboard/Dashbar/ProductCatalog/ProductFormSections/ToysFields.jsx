import { useFormContext } from "react-hook-form";
import TypeSelect from "./TypeSelect";

const ToysFields = () => {
  const { watch } = useFormContext();

  return (
    <div className={`space-y-4 toys-fields ${watch("category") === "toys" ? "block" : "hidden"}`}>
      <TypeSelect name="toyType" />
    </div>
  );
};

export default ToysFields;
