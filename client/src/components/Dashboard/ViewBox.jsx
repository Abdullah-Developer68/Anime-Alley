import { Routes, Route } from "react-router-dom";

import ProductCatalog from "./Dashbar/ProductCatalog/ProductCatalog";
import Orders from "./Dashbar/Orders/Orders";
import Users from "./Dashbar/Users/Users";
import Coupons from "./Dashbar/Coupons/Coupons";

const ViewBox = () => {
  return (
    <div className="min-w-0">
      <Routes>
        <Route path="/" element={<ProductCatalog />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/users" element={<Users />} />
        <Route path="/coupons" element={<Coupons />} />
      </Routes>
    </div>
  );
};

export default ViewBox;
