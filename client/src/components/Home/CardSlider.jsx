import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import assets from "../../assets/asset";

const CardSlider = () => {
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
        breakpoint: 790,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          centerMode: true,
          centerPadding: "0px",
        },
      },
    ],
  };

  const comics = [
    { img: assets.dragonBallComic, label: "Dragon Ball Z" },
    {
      img: assets.narutoComic,
      label: "Naruto",
    },
    {
      img: assets.pokemonComic,
      label: "Pokemon",
    },
    {
      img: assets.saoComic,
      label: "SAO",
    },
  ];

  return (
    <div className="z-40 w-full max-w-6xl mx-auto max-[610px]:px-64 max-[830px]:px-32">
      <div className="[&_.slick-prev]:left-2 [&_.slick-next]:right-2 [&_.slick-prev]:z-10 [&_.slick-next]:z-10 [&_.slick-prev:before]:text-2xl [&_.slick-next:before]:text-2xl">
        <Slider {...settings}>
          {comics.map((comic, index) => (
            <div key={index} className="px-2">
              <div className="group relative w-full max-w-[300px] mx-auto bg-black/60 backdrop-blur-sm border border-orange-500/40 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:scale-100 hover:shadow-orange-500/20 hover:border-orange-500/60">
                <div className="w-full aspect-[3/4] overflow-hidden">
                  <img
                    src={comic.img}
                    alt={`Slide ${index}`}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                <div className="absolute bottom-0 inset-x-0 p-2 text-center bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                  <h3 className="text-xs sm:text-sm font-medium text-red-400 tracking-wide">
                    {comic.label}
                  </h3>
                </div>

                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
};

export default CardSlider;
