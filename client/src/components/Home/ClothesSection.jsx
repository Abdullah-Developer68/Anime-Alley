import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Link } from "react-router-dom";
import { setCategory } from "../../redux/Slice/shopSlice";
import { useDispatch } from "react-redux";
import assets from "../../assets/asset";

const ClothesSection = () => {
  const dispatch = useDispatch();
  const products = [
    { image: assets.aotHoddie, label: "Hoddy" },
    { image: assets.jjkPants, label: "Pants" },
    { image: assets.narutoShoes, label: "Shoes" },
  ];

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 3,
    initialSlide: 0,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 2,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 830,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
          initialSlide: 2,
        },
      },
      {
        breakpoint: 820,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          centerMode: true,
          centerPadding: "0px",
        },
      },
    ],
  };

  return (
    <div
      className="relative flex flex-col justify-center items-center w-full min-h-[690px] overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${assets.halloweenBackground})` }}
    >
      <div className="absolute inset-0 bg-black opacity-20 pointer-events-none"></div>

      <h2 className="z-40 text-2xl md:text-3xl lg:text-4xl font-bold text-orange-500 mb-8 text-center tracking-wider mt-16 md:mt-24 px-4">
        Spooky Fashion Collection
      </h2>
      <Link to={"/shop"} className="z-40">
        <div
          className="bg-orange-500 px-4 py-2 rounded-full mb-10 cursor-pointer z-10"
          onClick={() => dispatch(setCategory("clothes"))}
        >
          Shop Now!
        </div>
      </Link>

      {/* Product Cards Slider */}
      <div className="z-40 w-full max-w-6xl mx-auto px-8">
        <div className="[&_.slick-prev]:left-2 [&_.slick-next]:right-2 [&_.slick-prev]:z-10 [&_.slick-next]:z-10 [&_.slick-prev:before]:text-2xl [&_.slick-next:before]:text-2xl">
          <Slider {...settings}>
            {products.map((product, index) => (
              <div key={index} className="px-2">
                <div className="group relative w-full max-w-[140px] sm:max-w-[160px] md:max-w-[180px] mx-auto bg-black/60 backdrop-blur-sm border border-orange-500/40 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:scale-100 hover:shadow-orange-500/20 hover:border-orange-500/60">
                  <div className="w-full aspect-[3/4] overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.label}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="absolute bottom-0 inset-x-0 p-2 text-center bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <h3 className="text-xs sm:text-sm font-medium text-orange-400 tracking-wide">
                      {product.label}
                    </h3>
                  </div>

                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </div>
  );
};

export default ClothesSection;
