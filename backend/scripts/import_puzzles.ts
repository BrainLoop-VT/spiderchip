import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import fs from 'fs/promises';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface TestCase {
    slots?: number[];           // Initial slot values
    input: number[];           // Input values
    output: number[];          // Expected output
    cmd?: Record<string, number[]>;  // Command inputs if any
    target?: number[];         // Target slot values
}

interface PuzzleFile {
    title: string;
    overview: string;          // Was Pre-description
    description: string;
    slotCount: number;
    slotNames: (string | null)[];
    objects: Array<{ name: string, type: string }>;
    testCases: TestCase[];
    puzzleNumber: number;
}

async function parsePuzzleFile(filePath: string): Promise<PuzzleFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let puzzle: Partial<PuzzleFile> = {};
    let currentSection = '';
    let testCases: TestCase[] = [];
    let currentCase: Partial<TestCase> = {};

    // Extract puzzle number from filename (e.g., "p1.txt" -> 1)
    const filename = path.basename(filePath);
    puzzle.puzzleNumber = parseInt(filename.replace(/[^0-9]/g, ''));

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('Puzzle')) {
            puzzle.title = line.split(':')[1].trim();
        } else if (line === 'Pre-description:') {
            currentSection = 'overview';
            puzzle.overview = '';
        } else if (line === 'Task:') {
            currentSection = 'description';
            puzzle.description = '';
        } else if (line === 'Slot count:') {
            puzzle.slotCount = parseInt(lines[++i].trim());
        } else if (line === 'Slot names:') {
            puzzle.slotNames = lines[++i].trim()
                .split(',')
                .map(name => name.trim() === 'null' ? null : name.trim());
        } else if (line === 'Objects:') {
            puzzle.objects = [];
            i++;
            while (i < lines.length && lines[i].trim() !== '') {
                if (lines[i].trim() === 'None') break;
                const [name, type] = lines[i].trim().split(' ').map(s => s.replace(/"/g, ''));
                puzzle.objects.push({ name, type });
                i++;
            }
        } else if (line.match(/^\d+\s+(Input|Slots|Target|Output|cmd):/)) {
            const [caseNum, type] = line.split(/\s+(Input|Slots|Target|Output|cmd):/);
            const values = JSON.parse(line.split(':')[1].trim());
            
            if (!testCases[parseInt(caseNum)]) {
                testCases[parseInt(caseNum)] = {
                    input: [],
                    output: [],
                    slots: undefined,
                    target: undefined,
                    cmd: undefined
                };
            }
            
            switch (type.trim()) {
                case 'Input': testCases[parseInt(caseNum)].input = values; break;
                case 'Output': testCases[parseInt(caseNum)].output = values; break;
                case 'Slots': testCases[parseInt(caseNum)].slots = values; break;
                case 'Target': testCases[parseInt(caseNum)].target = values; break;
                case 'cmd': testCases[parseInt(caseNum)].cmd = { cmd: values }; break;
            }
        } else {
            switch (currentSection) {
                case 'overview':
                    puzzle.overview = (puzzle.overview || '') + line + '\n';
                    break;
                case 'description':
                    if (line.startsWith('```')) continue;
                    puzzle.description = (puzzle.description || '') + line + '\n';
                    break;
            }
        }
    }

    puzzle.testCases = testCases.filter(tc => tc);

    return puzzle as PuzzleFile;
}

async function importPuzzles(puzzlesDir: string) {
    try {
        const files = await fs.readdir(puzzlesDir);
        
        for (const file of files) {
            if (!file.endsWith('.txt')) continue;
            
            console.log(`Processing ${file}...`);
            const puzzle = await parsePuzzleFile(path.join(puzzlesDir, file));
            
            const levelData: Prisma.levelsCreateInput = {
                title: puzzle.title,
                description: puzzle.description.trim(),
                puzzle_number: puzzle.puzzleNumber,
                input_data: {
                    overview: puzzle.overview?.trim(),  // Include overview in input_data
                    slot_count: puzzle.slotCount,
                    slot_names: puzzle.slotNames,
                    objects: puzzle.objects,
                    test_cases: puzzle.testCases.map(tc => ({
                        slots: tc.slots,
                        input: tc.input,
                        target: tc.target
                    }))
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