import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 📁 Ensure uploads directory exists
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 🎯 Multer storage setup
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, filename);
  },
});

// 🛡️ File filter: allow only images
const fileFilter = (_, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// 💾 Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max size
});

/**
 * 📤 POST /api/upload
 * Accepts: form-data with `image` field
 * Returns: { imageUrl }
 */
router.post('/', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
  });
});

/**
 * 🧩 Static file serving helper (used in server.js)
 */
export const serveUploads = (app) => {
  app.use('/uploads', express.static(uploadDir));
};

export default router;


