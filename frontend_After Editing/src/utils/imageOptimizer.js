/**
 * Image Optimization Utility (#10)
 * Generates optimized Cloudinary URLs with responsive transformations
 */

/**
 * Get optimized image URL from Cloudinary
 * @param {string} imageUrl - Original Cloudinary image URL
 * @param {object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export const getOptimizedUrl = (imageUrl, options = {}) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return imageUrl;

  const { width = 800, quality = "auto", format = "auto" } = options;
  const transformation = `w_${width},c_limit,q_${quality},f_${format}`;

  return imageUrl.replace("/upload/", `/upload/${transformation}/`);
};

/**
 * Get thumbnail URL
 * @param {string} imageUrl - Original image URL
 * @param {number} width - Thumbnail width (default 300)
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (imageUrl, width = 300) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return imageUrl;
  return imageUrl.replace("/upload/", `/upload/w_${width},h_${width},c_fill,q_auto,f_auto/`);
};

/**
 * Get responsive image srcSet for different screen sizes
 * @param {string} imageUrl - Original image URL
 * @returns {string} srcSet string for responsive images
 */
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
