export interface LevelItem {
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