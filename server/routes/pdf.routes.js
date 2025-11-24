
import { Router } from 'express';
import multer from 'multer';
import { processPdfUpload, detectPdfTables } from '../controllers/pdf.controller.js';

const router = Router();
const upload = multer(); // Configura multer para manejar archivos en memoria (buffer)

router.post('/process-pdf', upload.single('pdfFile'), processPdfUpload);
router.post('/detect-tables', upload.single('pdfFile'), detectPdfTables);

export default router;
