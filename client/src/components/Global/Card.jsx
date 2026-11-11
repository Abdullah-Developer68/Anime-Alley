import assets from "../../assets/asset";
import { useDispatch } from "react-redux";
import { transferProductData } from "../../redux/Slice/shopSlice";
import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/formatPrice";

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
        className="group bg-ink-900 rounded-xl overflow-hidden border border-white/[0.08] hover:border-pink-400/60 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-black/30 max-w-[200px] cursor-pointer"
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
            <h3 className="text-ink-50 font-semibold text-sm truncate max-w-[120px]">
              {product.name}
            </h3>
          </div>

          {/* Category */}
          <p className="text-ink-400 text-xs mb-1.5 capitalize">{product.category}</p>

          {/* Price and Add to Cart */}
          <div className="flex items-center justify-between">
            <p className="px-1.5 py-1 text-xs font-bold text-pink-300 bg-pink-500/15 rounded-md">
              {formatPrice(product.price)} $
            </p>
            {/* Add to Cart Button with product._id as the url parameter */}
            <span>
              <button className="p-1 text-xs font-medium text-black transition-colors duration-300 bg-ink-200 rounded-md cursor-pointer hover:bg-pink-400">
                <img src={assets.bag} alt="add to cart" className="w-5" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Cards;
