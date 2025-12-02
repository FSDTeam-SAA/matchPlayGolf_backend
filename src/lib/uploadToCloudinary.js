import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';

export const uploadToCloudinary = async (buffer, filename, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        // Validate buffer
        if (!buffer || !(buffer instanceof Buffer) && !Buffer.isBuffer(buffer)) {
            return reject(new Error('Invalid buffer provided'));
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 9);
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const publicId = `${timestamp}-${randomString}-${sanitizedFilename}`;

        // ✅ FIXED: Use upload_stream instead of upload
        const uploadOptions = {
            folder: folder,
            public_id: publicId,
            resource_type: resourceType,
            use_filename: true,
            unique_filename: false,
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        // ✅ Create readable stream from buffer and pipe to Cloudinary
        const readableStream = Readable.from(buffer);
        
        readableStream.on('error', (err) => {
            console.error('❌ Stream error:', err);
            reject(err);
        });

        readableStream.pipe(uploadStream);
    });
};