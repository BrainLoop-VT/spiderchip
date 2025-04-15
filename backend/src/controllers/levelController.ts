import { Request, Response, NextFunction } from 'express';
import { LevelService } from '../services/levelService';

export class LevelController {
    // Get level with user progress
    static async getLevelWithProgress(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId, levelId } = req.params;
            const data = await LevelService.getLevelWithProgress(userId, levelId);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    // Get all levels (optionally with user progress)
    static async getAllLevels(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('Getting all levels');
            const userId = req.query.userId as string | undefined;
            const levels = await LevelService.getAllLevelsProgress(userId);
            console.log(`Found ${levels.length} levels`);
            res.json(levels);
        } catch (error) {
            console.error('Error getting levels:', error);
            next(error);
        }
    }

    // Save progress
    static async saveProgress(req: Request, res: Response, next: NextFunction) {
        try {
            const progress = await LevelService.saveProgress(req.body);
            res.json(progress);
        } catch (error) {
            next(error);
        }
    }
} 