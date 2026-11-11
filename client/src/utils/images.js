// Cloudinary serves any size and format from one upload. Asking for the displayed width in WebP/AVIF
// (f_auto) at automatic quality (q_auto) cuts product images to a fraction of the original bytes.
export const productImage = (url, width = 480) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/"))
    return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
};
