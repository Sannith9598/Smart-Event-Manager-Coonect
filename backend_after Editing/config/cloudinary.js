const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// Magic byte signatures for allowed file types
const MAGIC_BYTES = {
  'ffd8ff': 'image/jpeg',       // JPEG
  '89504e47': 'image/png',      // PNG
  '47494638': 'image/gif',      // GIF
  '52494646': 'image/webp',     // WEBP (RIFF header)
  '00000018': 'video/mp4',      // MP4 (ftyp)
  '0000001c': 'video/mp4',      // MP4 variant
  '00000020': 'video/mp4',      // MP4 variant
  '6674797069736f6d': 'video/mp4', // isom
  '667479704d534e56': 'video/mp4', // MSNV
};

/**
 * Validate file content by checking magic bytes.
 * Returns true if the buffer matches an allowed image type.
 */
function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;
  const hex = buffer.slice(0, 8).toString('hex').toLowerCase();
  
  // JPEG: starts with ffd8ff
  if (hex.startsWith('ffd8ff')) return true;
  // PNG: starts with 89504e47
  if (hex.startsWith('89504e47')) return true;
  // GIF: starts with 47494638
  if (hex.startsWith('47494638')) return true;
  // WEBP: starts with 52494646 and contains WEBP
  if (hex.startsWith('52494646') && buffer.length >= 12) {
    const webpCheck = buffer.slice(8, 12).toString('ascii');
    if (webpCheck === 'WEBP') return true;
  }
  
  return false;
}

/**
 * Validate file content for media (images + videos).
 */
function validateMediaMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;
  
  // Check image types first
  if (validateImageMagicBytes(buffer)) return true;
  
  // MP4/MOV: check for ftyp box
  const hex = buffer.slice(0, 12).toString('hex').toLowerCase();
  if (hex.includes('66747970')) return true; // 'ftyp' in hex
  
  // WEBM: starts with 1a45dfa3
  if (hex.startsWith('1a45dfa3')) return true;
  
  // QuickTime MOV
  if (hex.includes('6d6f6f76')) return true; // 'moov'
  if (hex.includes('6d646174')) return true; // 'mdat'
  
  return false;
}

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Media file filter (images + videos)
const mediaFileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|webp/;
  const videoTypes = /mp4|mov|webm|quicktime/;
  const isImage = imageTypes.test(file.mimetype);
  const isVideo = videoTypes.test(file.mimetype);

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only image (JPEG, PNG, WEBP) and video (MP4, MOV, WEBM) files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Media upload multer config (50MB limit for videos)
// Uses disk storage to avoid memory pressure from large video files
const os = require('os');
const path = require('path');
const fs = require('fs');

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = path.join(os.tmpdir(), 'event-uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadMedia = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: mediaFileFilter
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder) => {
  // Validate magic bytes before uploading
  if (!validateImageMagicBytes(buffer)) {
    return Promise.reject(new Error('Invalid file content. File does not match allowed image types.'));
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
        // Enable responsive breakpoints for image optimization (#10)
        responsive_breakpoints: {
          create_derived: true,
          bytes_step: 20000,
          min_width: 200,
          max_width: 1000,
          max_images: 4,
        },
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// Upload media (image or video) to Cloudinary with type-aware options
// Accepts either a buffer or a file path
const uploadMediaToCloudinary = (bufferOrPath, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
    };
    if (resourceType === 'image' || resourceType === 'auto') {
      options.transformation = [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }];
    }
    if (resourceType === 'video') {
      options.transformation = [{ quality: 'auto', fetch_format: 'mp4' }];
      options.eager = [{ width: 300, height: 300, crop: 'fill', format: 'jpg' }];
      options.eager_async = true;
    }

    // If it's a string (file path), use upload directly
    if (typeof bufferOrPath === 'string') {
      cloudinary.uploader.upload(bufferOrPath, options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      return;
    }

    // Otherwise stream from buffer
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    const readableStream = new Readable();
    readableStream.push(bufferOrPath);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// Helper to generate optimized image URL with transformations (#10)
const getOptimizedImageUrl = (publicId, options = {}) => {
  const { width = 800, height, quality = 'auto', format = 'auto' } = options;
  const transformations = [
    { width, crop: 'limit', quality, fetch_format: format },
  ];
  if (height) transformations[0].height = height;
  return cloudinary.url(publicId, { transformation: transformations, secure: true });
};

// Generate thumbnail URL
const getThumbnailUrl = (imageUrl, width = 300) => {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return imageUrl;
  // Insert transformation before /upload/ or after version
  return imageUrl.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`);
};

// Middleware for single image upload
const uploadVerificationImage = upload.single('image');

// Middleware for multiple images
const uploadMultipleImages = upload.array('images', 10);

// Middleware for event image
const uploadEventImage = upload.single('image');

// Middleware for single media file (image or video)
const uploadMediaFile = uploadMedia.single('media');

module.exports = {
  cloudinary,
  uploadVerificationImage,
  uploadMultipleImages,
  uploadEventImage,
  uploadToCloudinary,
  uploadMediaToCloudinary,
  uploadMediaFile,
  getOptimizedImageUrl,
  getThumbnailUrl,
  validateImageMagicBytes,
  validateMediaMagicBytes
};