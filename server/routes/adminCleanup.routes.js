import express from 'express';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import adminCleanupController from '../controllers/adminCleanup.controller.js';

const router = express.Router();

router.post('/enqueue', requireFirebaseAuth, adminCleanupController.enqueueOwnedCleanup);
router.post('/run-pending', requireFirebaseAuth, adminCleanupController.runPendingOwnedCleanup);

export default router;
