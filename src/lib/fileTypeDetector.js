// ============================================
// FILE TYPE DETECTOR - fileTypeDetector.js (FIXED)
// ============================================

const getFileType = (mimetype, filename) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'raw';
};

const getResourceType = (fileType) => {
  const mapping = {
    image: 'image',
    video: 'video',
    audio: 'video', // Cloudinary uses 'video' for audio
    raw: 'raw',
  };
  return mapping[fileType] || 'auto';
};

export { getFileType, getResourceType };