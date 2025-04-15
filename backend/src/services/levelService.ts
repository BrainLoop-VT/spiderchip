import { getPrisma } from "../config/db"
import { NotFoundError } from "../errors";
import { GameLevel } from "../models/GameLevel";
import { UserProgress } from "../models/UserProgress";
import { Prisma, levels, user_progress } from "@prisma/client";

interface LevelWithProgress {
    id: string;
    title: string;
    description: string;
    preDescription?: string;
    puzzleNumber: number;
    status: 'completed' | 'skipped' | 'available' | 'not-available';
    inputData: {
        slot_count: number;
        slot_names: (string | null)[];
        objects: Array<{ name: string, type: string }>;
        test_cases: Array<{
            input: number[];
            expected_output: number[];
            description: string;
        }>;
        solution_code: string;
        target_line_count: number;
        bonus_solution_code?: string;
        bonus_line_count?: number;
        hints: string[];
        Pre_description: string;
    };
}

export class LevelService {

    // Get all available levels entirely
    static async getAllLevels(): Promise<LevelWithProgress[]> {
        console.log("getAllLevels");
        const prisma = await getPrisma();
        const levels = await prisma.levels.findMany({
            orderBy: {
                puzzle_number: 'asc'
            } as Prisma.levelsOrderByWithRelationInput
        });

        return levels.map((level) => ({
            id: level.id,
            title: level.title,
            description: level.description,
            preDescription: (level.input_data as any)?.Pre_description,
            puzzleNumber: (level as any).puzzle_number,
            status: 'available',
            inputData: level.input_data as LevelWithProgress['inputData']
        }));
    }

    // Get all available levels with user progress
    static async getAllLevelsProgress(userId?: string): Promise<LevelWithProgress[]> {
        const prisma = await getPrisma();
        
        const levels = await prisma.levels.findMany({
            orderBy: {
                puzzle_number: 'asc'
            },
            include: userId ? {
                user_progress: {
                    where: { user_id: userId }
                }
            } : undefined
        }) as (levels & {
            user_progress: user_progress[];
        })[];

        return levels.map(level => ({
            id: level.id,
            title: level.title,
            description: level.description,
            preDescription: (level.input_data as any)?.Pre_description,
            puzzleNumber: level.puzzle_number,
            status: this.determineStatus(level.user_progress?.[0]),
            inputData: level.input_data as LevelWithProgress['inputData']
        }));
    }

    //Get singular level without progress based on level number
    static async getLevelWithoutProgress(levelNumber: number): Promise<LevelWithProgress> {
        const prisma = await getPrisma();
        const level = await prisma.levels.findUnique({
            where: { puzzle_number: levelNumber }
        });

        if (!level) {
            throw new NotFoundError(`Level with number ${levelNumber} not found`);
        }

        return {
            id: level.id,
            title: level.title,
            description: level.description,
            preDescription: (level.input_data as any)?.Pre_description,
            puzzleNumber: level.puzzle_number,
            status: 'available',
            inputData: level.input_data as LevelWithProgress['inputData']
        };
    }

    private static determineStatus(progress: any): LevelWithProgress['status'] {
        if (!progress) return 'available';
        if (progress.completed) return 'completed';
        if (progress.attempts > 0) return 'skipped';
        return 'available';
    }

    // Get single level with progress
    static async getLevelWithProgress(userId: string, levelId: string): Promise<LevelWithProgress> {
        const prisma = await getPrisma();
        
        const level = await prisma.levels.findUnique({
            where: { id: levelId },
            include: {
                user_progress: {
                    where: { user_id: userId }
                }
            }
        });

        if (!level) {
            throw new NotFoundError(`Level with ID ${levelId} not found`);
        }

        const progress = level.user_progress?.[0];

        return {
            id: level.id,
            title: level.title,
            description: level.description,
            preDescription: (level.input_data as any)?.Pre_description,
            puzzleNumber: level.puzzle_number,
            status: this.determineStatus(progress),
            inputData: level.input_data as LevelWithProgress['inputData']
        };
    }


    // Save user progress
    static async saveProgress(progress: UserProgress): Promise<UserProgress> {
        const prisma = await getPrisma();
        const data = progress.toJSON();
        
        const updateData: Prisma.user_progressUpdateInput = {
            completed: data.completed,
            current_solution: data.current_solution,
            attempts: data.attempts,
            last_attempt_at: data.last_attempt_at,
            test_case_results: JSON.stringify(data.test_case_results)
        };

        const updatedData = await prisma.user_progress.update({
            where: {
                user_id_level_id: {
                    user_id: progress.userId,
                    level_id: progress.levelId
                }
            },
            data: updateData
        });

        return new UserProgress(updatedData);
    }
} 