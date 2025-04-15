import express from 'express';
import { LevelController } from '../controllers/levelController';
import { requireAuth } from '../middleware/requireAuth';
import { LevelService } from '../services/levelService';

const router = express.Router();

console.log('Setting up level routes...');

// All routes require authentication
router.use(requireAuth);

// Get all levels (optionally with user progress)
router.get('/', (req, res, next) => {
    console.log('GET / route hit in levelRoutes');
    LevelController.getAllLevels(req, res, next);
});

// Get specific level with user progress
router.get('/:levelId/progress/:userId', LevelController.getLevelWithProgress);

// Save progress
router.post('/progress', LevelController.saveProgress);

console.log('Level routes setup complete');

export default router; 