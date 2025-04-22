export interface LevelItem {
    id: string;
    title: string;
    description: string;
    preDescription?: string;
    puzzleNumber: number;
    status: 'completed' | 'skipped' | 'available' | 'not-available';
    inputData: {
        overview: string;
        slot_count: number;
        slot_names: (string | null)[];
        objects: Array<{ name: string, type: string }>;
        test_cases: Array<{
            slots?: number[];
            input: number[];
            target?: number[];
            cmd?: Record<string, number[]>;
        }>;
        solution_code: string;
        target_line_count: number;
        bonus_solution_code?: string;
        bonus_line_count?: number;
        hints: string[];
    };
}

export enum LineHighlightType {
    DEBUG = "debug",
    INFO = "info",
    SUCCESS = "success",
    WARNING = "warning"
}

export interface LineHighlight {
    line: number;
    type: LineHighlightType;
}
