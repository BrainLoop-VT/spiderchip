// This would contain the specific structure for the level's input data
interface TestCase {
    input: number[];
    expected_output: number[];
    description: string;
}

interface PuzzleObject {
    name: string;
    type: string;
    // Additional object properties can be added as needed
}

export class LevelInput {
    slotCount: number;
    slotNames: (string | null)[];
    objects: PuzzleObject[];
    testCases: TestCase[];
    solutionCode: string;
    targetLineCount: number;
    bonusSolutionCode?: string;
    bonusLineCount?: number;
    hints: string[];

    constructor(data: any) {
        this.slotCount = data.slot_count;
        this.slotNames = data.slot_names;
        this.objects = data.objects || [];
        this.testCases = data.test_cases;
        this.solutionCode = data.solution_code;
        this.targetLineCount = data.target_line_count;
        this.bonusSolutionCode = data.bonus_solution_code;
        this.bonusLineCount = data.bonus_line_count;
        this.hints = data.hints || [];
    }

    toJSON() {
        return {
            slot_count: this.slotCount,
            slot_names: this.slotNames,
            objects: this.objects,
            test_cases: this.testCases,
            solution_code: this.solutionCode,
            target_line_count: this.targetLineCount,
            bonus_solution_code: this.bonusSolutionCode,
            bonus_line_count: this.bonusLineCount,
            hints: this.hints
        };
    }
} 