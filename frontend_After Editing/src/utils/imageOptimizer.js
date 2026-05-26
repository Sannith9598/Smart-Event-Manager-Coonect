// Returns a Cloudinary URL with width/quality/format transformations applied
export const getOptimizedUrl = (imageUrl, options = {}) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return imageUrl;

  const { width = 800, quality = "auto", format = "auto" } = options;
  const transformation = `w_${width},c_limit,q_${quality},f_${format}`;

  return imageUrl.replace("/upload/", `/upload/${transformation}/`);
};

// Returns a square cropped thumbnail URL at the given width (default 300px)
export const getThumbnailUrl = (imageUrl, width = 300) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return imageUrl;
  return imageUrl.replace("/upload/", `/upload/w_${width},h_${width},c_fill,q_auto,f_auto/`);
};

// Builds a srcSet string with multiple widths for responsive <img> elements
export const getResponsiveSrcSet = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return "";

  const widths = [320, 640, 960, 1280];
  return widths
    .map((w) => {
      const url = imageUrl.replace("/upload/", `/upload/w_${w},c_limit,q_auto,f_auto/`);
      return `${url} ${w}w`;
    })
    .join(", ");
};
