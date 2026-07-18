import { Router } from 'express';
import {
  getDestinations,
  getDestinationById,
  addDestination,
  deleteDestination,
  addReview,
} from '../controllers/destinationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getDestinations);
router.get('/:id', getDestinationById);
router.post('/', authenticateToken, addDestination);
router.delete('/:id', authenticateToken, deleteDestination);
router.post('/:id/reviews', addReview); // Public/private reviews, let's keep it public/accessible

export default router;
