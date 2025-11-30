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
    <div
      key={product._id}
      className="group bg-gradient-to-b bg-black rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 shadow-lg max-w-[200px]"
      onClick={() => {
        sendProductData(); // Call the function to send product data to Redux store
      }}
    >
      {/* Product Image */}
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Product Info */}
      <div className="p-2">
        {/* Title and Rating */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-white/90 font-medium text-sm truncate max-w-[120px]">
            {product.name}
          </h3>
        </div>

        {/* Category */}
        <p className="text-white/50 text-xs mb-1.5">{product.category}</p>

        {/* Price and Add to Cart */}
        <div className="flex justify-between items-center">
          <p className="text-black p-1 rounded-md font-bold text-xs bg-gray-300">
            {product.price} $
          </p>
          {/* Add to Cart Button with product._id as the url parameter */}
          <Link to={`/shop/:${product._id}`}>
            <button
              className="cursor-pointer p-1 rounded-md bg-gray-300 hover:bg-white text-black text-xs font-medium transition-all duration-300"
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
  );
};

export default Cards;
