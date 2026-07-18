import { Router } from 'express';
import { getRecommendations, chatAssistant } from '../controllers/aiController';

const router = Router();

router.post('/recommend', getRecommendations);
router.post('/chat', chatAssistant);

export default router;
