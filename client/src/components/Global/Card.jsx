import assets from "../../assets/asset";
import { useDispatch } from "react-redux";
import { transferProductData } from "../../redux/Slice/shopSlice";
import { Link } from "react-router-dom";

/* eslint-disable react/prop-types */
const Cards = ({ product }) => {
  const dispatch = useDispatch();
  const sendProductData = () => {
    dispatch(transferProductData(product)); // sent so it can be viewed in ProductDes
  };

  // Use the image URL directly (Cloudinary or local)
  const imageUrl = product.image;

  return (
    <Link to={`/shop/:${product._id}`}>
      <div
        key={product._id}
        className="group bg-gradient-to-b bg-black rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 shadow-lg max-w-[200px]  cursor-pointer"
        onClick={() => {
          sendProductData(); // Call the function to send product data to Redux store
        }}
      >
        {/* Product Image */}
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={imageUrl}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Product Info */}
        <div className="p-2">
          {/* Title and Rating */}
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-white/90 font-medium text-sm truncate max-w-[120px]">
              {product.name}
            </h3>
          </div>

          {/* Category */}
          <p className="text-white/50 text-xs mb-1.5">{product.category}</p>

          {/* Price and Add to Cart */}
          <div className="flex items-center justify-between">
            <p className="p-1 text-xs font-bold text-black bg-gray-300 rounded-md">
              {product.price} $
            </p>
            {/* Add to Cart Button with product._id as the url parameter */}
            <Link to={`/shop/:${product._id}`}>
              <button
                className="p-1 text-xs font-medium text-black transition-all duration-300 bg-gray-300 rounded-md cursor-pointer hover:bg-white"
                onClick={() => {
                  sendProductData(); // Call the function to send product data to Redux store
                }}
              >
                <img src={assets.bag} alt="add to cart" className="w-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Cards;
