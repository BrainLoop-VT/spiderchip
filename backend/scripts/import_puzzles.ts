import fs from 'fs/promises';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface PuzzleFile {
    title: string;
    preDescription: string;
    description: string;
    slotCount: number;
    slotNames: (string | null)[];
    objects: any[];
    testCases: {
        input: number[];
        expected_output: number[];
        description: string;
    }[];
    solutionCode: string;
    targetLineCount: number;
    bonusSolutionCode?: string;
    bonusLineCount?: number;
    hints: string[];
    puzzleNumber: number;
}

async function parsePuzzleFile(filePath: string): Promise<PuzzleFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let puzzle: Partial<PuzzleFile> = {};
    let currentSection = '';
    let testCases = [];
    let hints = [];
    let currentCase: any = {};
    let puzzleFilename = '';
    let puzzleNumber = 0;

    // Get puzzle id from filename without the .txt extension
    puzzleFilename = path.basename(filePath, '.txt');
    console.log(`Puzzle ID: ${puzzleFilename}`);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        puzzleNumber = parseInt(puzzleFilename.split('p')[1]);
        puzzle.puzzleNumber = puzzleNumber;
        
        if (line.startsWith('Puzzle')) {
            puzzle.title = line.split(':')[1].trim();
        } else if (line === 'Pre-description:') {
            currentSection = 'preDescription';
            puzzle.preDescription = '';
        } else if (line === 'Task:') {
            currentSection = 'description';
            puzzle.description = '';
        } else if (line === 'Hints:') {
            currentSection = 'hints';
        } else if (line === 'Slot count:') {
            puzzle.slotCount = parseInt(lines[++i].trim());
        } else if (line === 'Slot names:') {
            puzzle.slotNames = lines[++i].trim()
                .split(',')
                .map(name => name.trim() === 'null' ? null : name.trim());
        } else if (line === 'Objects:') {
            const objectLine = lines[++i].trim();
            if (objectLine === 'None') {
                puzzle.objects = [];
            } else {
                const [name, type] = objectLine.split(' ').map(s => s.trim().replace(/"/g, ''));
                puzzle.objects = [{ name, type }];
            }
        } else if (line === 'Cases:') {
            currentSection = 'cases';
            currentCase = {};
        } else if (line === 'Solution code:') {
            currentSection = 'solution';
            puzzle.solutionCode = '';
        } else if (line === 'Target line count:') {
            puzzle.targetLineCount = parseInt(lines[++i].trim());
        } else if (line === 'Bonus solution code:') {
            currentSection = 'bonusSolution';
            puzzle.bonusSolutionCode = '';
        } else if (line === 'Bonus line count:') {
            puzzle.bonusLineCount = parseInt(lines[++i].trim());
        } else {
            switch (currentSection) {
                case 'preDescription':
                    puzzle.preDescription = (puzzle.preDescription || '') + line + '\n';
                    break;
                case 'description':
                    if (line.startsWith('```')) continue;
                    puzzle.description = (puzzle.description || '') + line + '\n';
                    break;
                case 'hints':
                    if (line) hints.push(line);
                    break;
                case 'cases':
                    if (line.match(/^\d+\s+Slots:/)) {
                        if (Object.keys(currentCase).length > 0) {
                            testCases.push({
                                input: currentCase.input,
                                expected_output: currentCase.target || currentCase.output,
                                description: `Test case ${testCases.length + 1}`
                            });
                        }
                        currentCase = {
                            slots: JSON.parse(line.split('Slots:')[1].trim())
                        };
                    } else if (line.startsWith('Target:')) {
                        currentCase.target = JSON.parse(line.split('Target:')[1].trim());
                    } else if (line.startsWith('Input:')) {
                        currentCase.input = JSON.parse(line.split('Input:')[1].trim());
                    } else if (line.startsWith('Output:')) {
                        currentCase.output = JSON.parse(line.split('Output:')[1].trim());
                    }
                    break;
                case 'solution':
                    puzzle.solutionCode = (puzzle.solutionCode || '') + line + '\n';
                    break;
                case 'bonusSolution':
                    puzzle.bonusSolutionCode = (puzzle.bonusSolutionCode || '') + line + '\n';
                    break;
            }
        }
    }

    // Add the last test case if there is one
    if (Object.keys(currentCase).length > 0) {
        testCases.push({
            input: currentCase.input,
            expected_output: currentCase.target || currentCase.output,
            description: `Test case ${testCases.length + 1}`
        });
    }

    puzzle.testCases = testCases;
    puzzle.hints = hints;

    return puzzle as PuzzleFile;
}

async function importPuzzles(puzzlesDir: string) {
    try {
        const files = await fs.readdir(puzzlesDir);
        
        for (const file of files) {
            if (!file.endsWith('.txt')) continue;
            
            console.log(`Processing ${file}...`);
            const puzzle = await parsePuzzleFile(path.join(puzzlesDir, file));
            
            // Type the data object explicitly
            const levelData: Prisma.levelsCreateInput = {
                title: puzzle.title,
                description: puzzle.description.trim(),
                puzzle_number: puzzle.puzzleNumber,
                input_data: {
                    slot_count: puzzle.slotCount,
                    slot_names: puzzle.slotNames,
                    objects: puzzle.objects,
                    test_cases: puzzle.testCases,
                    solution_code: puzzle.solutionCode.trim(),
                    target_line_count: puzzle.targetLineCount,
                    bonus_solution_code: puzzle.bonusSolutionCode?.trim(),
                    bonus_line_count: puzzle.bonusLineCount,
                    hints: puzzle.hints,
                    Pre_description: puzzle.preDescription.trim()
                }
            };

            await prisma.levels.create({
                data: levelData
            });
            
            console.log(`Imported puzzle ${puzzle.puzzleNumber}: ${puzzle.title}`);
        }
        
        console.log('All puzzles imported successfully!');
    } catch (error) {
        console.error('Error importing puzzles:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Usage
const puzzlesDir = process.argv[2] || path.join(__dirname, '..', 'puzzles');
importPuzzles(puzzlesDir); 