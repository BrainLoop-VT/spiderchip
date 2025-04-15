export interface TestCaseResult {
    testCaseId: number;
    passed: boolean;
    lastAttempt?: Date;
    executionTime?: number;  // in milliseconds
}

export class UserProgress {
    id: string;
    userId: string;
    levelId: string;
    completed: boolean;
    current_solution?: string;  // Match database column name
    test_case_results: TestCaseResult[];  // Match database column name
    attempts: number;
    created_at: Date;
    updated_at: Date;
    last_attempt_at?: Date;  // Match database column name

    constructor(data: any) {
        this.id = data.id;
        this.userId = data.user_id;
        this.levelId = data.level_id;
        this.completed = data.completed;
        this.current_solution = data.current_solution;
        this.test_case_results = data.test_case_results || [];
        this.attempts = data.attempts || 0;
        this.created_at = new Date(data.created_at);
        this.updated_at = new Date(data.updated_at);
        this.last_attempt_at = data.last_attempt_at ? new Date(data.last_attempt_at) : undefined;
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.userId,
            level_id: this.levelId,
            completed: this.completed,
            current_solution: this.current_solution,
            test_case_results: this.test_case_results,
            attempts: this.attempts,
            created_at: this.created_at,
            updated_at: this.updated_at,
            last_attempt_at: this.last_attempt_at
        };
    }

    // Helper method to update test case results
    updateTestCaseResult(testCaseId: number, passed: boolean) {
        const existingResult = this.test_case_results.find(r => r.testCaseId === testCaseId);
        if (existingResult) {
            existingResult.passed = passed;
            existingResult.lastAttempt = new Date();
        } else {
            this.test_case_results.push({
                testCaseId,
                passed,
                lastAttempt: new Date()
            });
        }
    }
} 