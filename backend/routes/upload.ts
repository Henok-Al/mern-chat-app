import express, { Request, Response } from 'express';
import multer from 'multer';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage (since we'll be uploading directly to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images only
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(file.originalname.toLowerCase().match(/\.[^/.]+$/)?.[0] || '');
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    }
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Convert buffer to base64 for Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await cloudinary.v2.uploader.upload(dataURI, {
            folder: 'chat-app', // Folder to organize uploads
            resource_type: 'auto'
        });

        res.json({
            url: result.secure_url, // Secure URL for the uploaded image
            type: req.file.mimetype,
            filename: result.public_id,
            publicId: result.public_id
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        res.status(500).json({ 
            message: 'File upload failed', 
            error: error.message 
        });
    }
});

export default router;
