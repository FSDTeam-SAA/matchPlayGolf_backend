import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';

const uploadToCloudinary = async (buffer, filename, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        // Validate buffer
        if (!buffer || !(buffer instanceof Buffer) && !Buffer.isBuffer(buffer)) {
            return reject(new Error('Invalid buffer provided'));
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 9);
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const publicId = `${timestamp}-${randomString}-${sanitizedFilename}`;

        console.log('🔧 Cloudinary upload config:', {
            folder,
            publicId,
            resourceType,
            bufferSize: buffer.length
        });

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
                    console.log('✅ Cloudinary upload success:', {
                        url: result.secure_url,
                        public_id: result.public_id,
                        resource_type: result.resource_type
                    });
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

 export default uploadToCloudinary;