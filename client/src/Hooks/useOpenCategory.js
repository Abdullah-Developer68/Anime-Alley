import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCategory } from "../redux/Slice/shopSlice";

// Opens the shop on a category's first page, from anywhere (nav, footer, home cards)
const useOpenCategory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return useCallback(
    (category) => {
      dispatch(setCategory(category));
      navigate("/shop");
    },
    [dispatch, navigate],
  );
};

export default useOpenCategory;
