import sharp from 'sharp';
import { promisify } from 'util';
import zlib from 'zlib';

const brotli = promisify(zlib.brotliCompress);
const unbrotli = promisify(zlib.brotliDecompress);

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
const MAX_BUFFER_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;
const IMAGE_QUALITY = 85;

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

export function isImage(filename) {
  return IMAGE_EXTENSIONS.includes(getFileExtension(filename));
}

export function isVideo(filename) {
  return VIDEO_EXTENSIONS.includes(getFileExtension(filename));
}

export function isAudio(filename) {
  return AUDIO_EXTENSIONS.includes(getFileExtension(filename));
}

export function isMediaFile(filename) {
  return isImage(filename) || isVideo(filename) || isAudio(filename);
}

export async function compressImage(buffer, extension) {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return buffer;
    }

    if (buffer.length > MAX_BUFFER_SIZE) {
      throw new Error('Image too large');
    }

    const image = sharp(buffer);
    const metadata = await image.metadata().catch(() => null);
    
    if (!metadata || !metadata.format || metadata.format === 'unknown') {
      return buffer;
    }
    
    const supportedFormats = ['png', 'jpeg', 'jpg', 'webp', 'gif', 'svg'];
    if (!supportedFormats.includes(metadata.format)) {
      return buffer;
    }
    
    if (extension === 'gif' && metadata.format === 'gif') {
      return buffer;
    }
    
    if (extension === 'svg' && metadata.format === 'svg') {
      return buffer;
    }
    
    let compressed;
    
    if (extension === 'png' && (metadata.format === 'png' || metadata.format === 'jpeg')) {
      compressed = await image
        .png({ quality: IMAGE_QUALITY, compressionLevel: 9 })
        .toBuffer();
    } else if ((extension === 'jpg' || extension === 'jpeg') && (metadata.format === 'jpeg' || metadata.format === 'jpg')) {
      compressed = await image
        .jpeg({ quality: IMAGE_QUALITY, progressive: true, mozjpeg: true })
        .toBuffer();
    } else if (extension === 'webp' && (metadata.format === 'webp' || metadata.format === 'jpeg' || metadata.format === 'png')) {
      compressed = await image
        .webp({ quality: IMAGE_QUALITY })
        .toBuffer();
    } else {
      return buffer;
    }
    
    if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
      compressed = await sharp(compressed)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
    }
    
    return compressed;
  } catch (err) {
    console.warn(`Failed to compress image ${extension}:`, err.message);
    return buffer;
  }
}

export async function compressText(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Buffer required for compression');
  }
  if (buffer.length > MAX_BUFFER_SIZE) {
    throw new Error('Content too large');
  }
  return await brotli(buffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length
    }
  });
}

export async function decompressText(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Buffer required for decompression');
  }
  return await unbrotli(buffer);
}

export async function compressFile(buffer, filename) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Buffer required');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('Valid filename required');
  }

  const ext = getFileExtension(filename);
  
  if (isImage(filename)) {
    try {
      return await compressImage(buffer, ext);
    } catch (err) {
      console.warn(`Failed to compress image ${filename}:`, err.message);
      return buffer;
    }
  }
  
  if (isVideo(filename) || isAudio(filename)) {
    return buffer;
  }
  
  return await compressText(buffer);
}

export async function decompressFile(buffer, filename) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Buffer required');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('Valid filename required');
  }

  if (isImage(filename) || isVideo(filename) || isAudio(filename)) {
    return buffer;
  }
  
  return await decompressText(buffer);
}

