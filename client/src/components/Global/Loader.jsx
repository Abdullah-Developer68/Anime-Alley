import PropTypes from "prop-types";

const Loader = ({ size = "md" }) => {
  // Size variants for different use cases
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  };

  const shurikenSize = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative">
        {/* Outer spinning ring with gradient */}
        <div
          className={`${sizeClasses[size]} border-4 border-transparent border-t-blue-500 border-r-purple-500 border-b-indigo-500 border-l-cyan-500 rounded-full animate-spin`}
          style={{ animationDuration: "1.2s" }}
        ></div>

        {/* Middle ring */}
        <div
          className={`absolute inset-2 border-2 border-transparent border-t-purple-400 border-l-blue-400 rounded-full animate-spin`}
          style={{ animationDuration: "0.8s", animationDirection: "reverse" }}
        ></div>

        {/* Inner shuriken */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`${shurikenSize[size]} relative animate-spin`}
            style={{ animationDuration: "2s", animationDirection: "reverse" }}
          >
            {/* Shuriken design using multiple triangular elements */}
            <div className="absolute inset-0">
              {/* Four main blades */}
              <div className="absolute top-0 w-0 h-0 transform -translate-x-1/2 border-l-4 border-r-4 border-transparent left-1/2 border-b-6 border-b-slate-700"></div>
              <div className="absolute right-0 w-0 h-0 transform -translate-y-1/2 border-t-4 border-b-4 border-transparent top-1/2 border-l-6 border-l-slate-700"></div>
              <div className="absolute bottom-0 w-0 h-0 transform -translate-x-1/2 border-l-4 border-r-4 border-transparent left-1/2 border-t-6 border-t-slate-700"></div>
              <div className="absolute left-0 w-0 h-0 transform -translate-y-1/2 border-t-4 border-b-4 border-transparent top-1/2 border-r-6 border-r-slate-700"></div>

              {/* Center hole */}
              <div className="absolute w-3 h-3 transform -translate-x-1/2 -translate-y-1/2 border rounded-full top-1/2 left-1/2 bg-slate-800 border-slate-600"></div>
              <div className="absolute w-1 h-1 transform -translate-x-1/2 -translate-y-1/2 rounded-full top-1/2 left-1/2 bg-slate-300"></div>
            </div>
          </div>
        </div>

        {/* Pulsing background effect with anime colors */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 rounded-full animate-pulse`}
          style={{ animationDuration: "1.8s" }}
        ></div>

        {/* Additional glow effect */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full animate-ping`}
          style={{ animationDuration: "2.5s" }}
        ></div>
      </div>

      {/* Loading text with anime styling */}
      <div className="absolute flex items-center mt-20 space-x-1 text-sm font-medium text-slate-600 animate-pulse">
        <span>Loading</span>
        <div className="flex space-x-1">
          <div
            className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-1 h-1 bg-purple-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-1 h-1 rounded-full bg-cyan-500 animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

Loader.propTypes = {
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
};

export default Loader;
