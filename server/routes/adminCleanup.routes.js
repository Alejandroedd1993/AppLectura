import express from 'express';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import adminCleanupController from '../controllers/adminCleanup.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { sendValidationError } from '../utils/validationError.js';
import {
	adminCleanupEnqueueRequestSchema,
	adminCleanupRunPendingRequestSchema
} from '../validators/requestSchemas.js';

const router = express.Router();

export const validateAdminCleanupEnqueueInput = validateRequest(adminCleanupEnqueueRequestSchema, {
	buildErrorPayload: ({ details }) => ({
		error: 'Solicitud de limpieza administrativa invalida',
		mensaje: details[0]?.message || 'Debes indicar el curso y el estudiante antes de reintentar.',
		codigo: 'INVALID_ADMIN_CLEANUP_REQUEST',
		...(details[0]?.path ? { field: details[0].path } : {}),
		ok: false,
		details
	})
});

export const validateAdminCleanupRunPendingInput = (req, res, next) => {
	const parsed = adminCleanupRunPendingRequestSchema.safeParse({
		maxJobs: req.body?.maxJobs ?? req.query?.maxJobs
	});

	if (!parsed.success) {
		const details = parsed.error.issues.map((issue) => ({
			path: Array.isArray(issue.path) ? issue.path.join('.') : '',
			message: issue.message,
			code: issue.code
		}));

		return sendValidationError(res, {
			error: 'Solicitud de worker de limpieza invalida',
			mensaje: details[0]?.message || 'Revisa el parametro maxJobs antes de reintentar.',
			codigo: 'INVALID_ADMIN_CLEANUP_WORKER_REQUEST',
			field: details[0]?.path || 'maxJobs',
			details
		});
	}

	req.body = {
		...(req.body || {}),
		...parsed.data
	};
	return next();
};

router.post('/enqueue', requireFirebaseAuth, validateAdminCleanupEnqueueInput, adminCleanupController.enqueueOwnedCleanup);
router.post('/run-pending', requireFirebaseAuth, validateAdminCleanupRunPendingInput, adminCleanupController.runPendingOwnedCleanup);

export default router;
