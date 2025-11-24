import { Router } from 'express';
import multer from 'multer';
import { ocrImageUpload } from '../controllers/ocr.controller.js';

const router = Router();
const upload = multer();

router.post('/ocr-image', upload.single('image'), ocrImageUpload);

export default router;
