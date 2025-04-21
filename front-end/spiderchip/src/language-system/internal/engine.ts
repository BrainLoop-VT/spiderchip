import * as LT from "../ls-interface-types";
import * as PT from "./parser-types";
import parse from "./parser";

const MAX_ITERATIONS = 1000; // infinite loop threshold
const ALLOW_EARLY_FAIL = true; // fail early for incorrect outputs (turn off for runtime debugging)

class BenignHalt extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class ExecutionEngine {
    puzzle: LT.Puzzle;
    test: LT.PuzzleTest;

    lintErrors: readonly PT.ErrorMessage[];
    labels: readonly PT.Label[];
    text: readonly (PT.Line | undefined)[];
    trueLineCount: number;

    inputs: number[];
    outputs: number[] = [];

    rtState: LT.SpiderStateEnum;
    haltReason: string | undefined = undefined; // reason why the runtime halted, e.g. "Division by zero."

    iters: number = 0;
    currentLine: number = 0;
    tape: LT.SpiderSlot[];
    objs: LT.SpiderObject[];

    jumpTo: number | undefined = 0; // jump destination if we just ran a jump - MUST POINT TO A REAL LINE
    shouldFollowIndent: boolean = false; // for if/else/while statements
    indentSourceStack: number[] = []; // lines we indented off of

    animations: LT.SpiderAnimation[] = []; // animations of the previous line's evaluation

    constructor(puzzle: LT.Puzzle, test: LT.PuzzleTest, text: string, variables: LT.CustomSlot[]) {
        this.puzzle = puzzle;
        this.test = test;
        this.inputs = test.inputQueue.slice();

        // the user only enters the text segment - we create the data segment
        const fullProgramText = [
            "SPDR PROGRAM",
            ".data",
            `tapelength ${this.puzzle.slotCount}`,
            this.getPuzzleDataText(variables),
            ".text",
            text
        ].join("\n");

        const parseResult = parse(fullProgramText);

        // we always need to share the tape and objects, since the frontend needs to display it
        this.tape = parseResult.data.tape.map((v) => new LT.SpiderSlot(v.value, v.name ?? ""));
        this.objs = parseResult.data.objects.map((o) => new LT.SpiderObject(o.type, o.name, o.contents));

        // preserve the remaining data out of that parsing
        this.lintErrors = parseResult.errors;
        this.labels = parseResult.data.labels;
        this.text = parseResult.text;
        this.trueLineCount = this.text.filter((x) => x !== undefined).length;

        // if it's valid let them know they can run, otherwise say it's invalid
        this.rtState = parseResult.valid ? LT.SpiderStateEnum.NEW : LT.SpiderStateEnum.INVALID;
    }

    lint(): LT.SpiderError[] {
        // need to put it in a language they understand
        return this.lintErrors.map((e) => new LT.SpiderError(e.line, e.msg));
    }

    lineCount(): number {
        return this.trueLineCount;
    }

    state(): LT.SpiderState {
        // need to copy everything so they can't mess with our internals
        const retTape = this.tape.map((s) => new LT.SpiderSlot(s.value, s.name ?? ""));
        const retObjs = this.objs.map((o) => new LT.SpiderObject(o.type, o.name, o.contents.slice()));
        const retInps = this.inputs.slice();
        const retOuts = this.outputs.slice();
        return new LT.SpiderState(this.rtState, retTape, retObjs, retInps, retOuts, this.currentLine, this.haltReason);
    }

    stateSimple(): LT.SpiderStateEnum {
        return this.rtState;
    }

    anim(): LT.SpiderAnimation[] {
        return this.animations.map((x) => { return { ...x } });
    }

    step(): undefined {
        if (this.rtState !== LT.SpiderStateEnum.NEW && this.rtState !== LT.SpiderStateEnum.RUNNING) {
            // already halted
            return;
        } else if (this.trueLineCount <= 0) {
            // no code!
            this.rtState = LT.SpiderStateEnum.FAIL;
            return;
        }

        this.rtState = LT.SpiderStateEnum.RUNNING;

        try {
            this.animations = [];
            this.continueToNextLine();
            this.executeCurrentLine();
        } catch (e: unknown) {
            if (e instanceof Error) {
                const benign = e instanceof BenignHalt;
                this.haltReason = e.message;
                this.animations.push({ type: LT.SpiderAnimationType.HALT, crash: !benign });
                if (benign) {
                    // they did a "normal" halt (i.e. not an error) - let them succeed if they've done so
                    if (this.test.expectedOutput.length !== this.outputs.length
                        || !this.test.expectedOutput.every((e, i) => e === this.outputs[i])) {
                        this.rtState = LT.SpiderStateEnum.FAIL;
                    }
                    else if (this.test.expectedSlots && !this.test.expectedSlots.every((e, i) => e === this.tape[i].value)) {
                        this.rtState = LT.SpiderStateEnum.FAIL;
                    } else {
                        this.rtState = LT.SpiderStateEnum.SUCCESS;
                    }
                } else {
                    this.rtState = LT.SpiderStateEnum.ERROR;
                }
            } else {
                this.animations.push({ type: LT.SpiderAnimationType.HALT, crash: true });
                this.haltReason = "INTERNAL ERROR: Unknown throwable.";
                this.rtState = LT.SpiderStateEnum.ERROR;
            }
        }
    }

    continueToNextLine() {
        /* JUMP QUIRKS:
           - Label indentation does not matter whatsoever
           - The line to execute is always whatever immediately follows a jump
         */

        /* Have fun in here. Tread carefully. */

        let executionLine = this.jumpTo ?? this.currentLine;
        let currentIndent = this.rtState === LT.SpiderStateEnum.NEW
            ? 0 // just starting execution
            : this.text[executionLine]?.indent ?? 0;

        if (this.jumpTo) {
            // find the next available line and start there
            do {
                executionLine = (executionLine + 1) % this.text.length;
            } while (!this.text[executionLine]);
            // our indent stack is out of date, we need to rebuild it to match our jumped position
            this.indentSourceStack = [];
            let indent = this.text[executionLine]!.indent - 1;
            let causeLine = executionLine;
            while (indent >= 0) {
                do {
                    causeLine--;
                    if (causeLine < 0) {
                        throw new Error("INTERNAL ERROR: Couldn't find cause for indentation after jump.");
                    }
                } while (!this.text[causeLine] || this.text[causeLine]!.indent !== indent);
                this.indentSourceStack.push(causeLine);
                indent--;
            }
        } else if (this.shouldFollowIndent) {
            // take whatever the next available line is
            this.indentSourceStack.push(executionLine); // we're still on the statement that's making us go up, save it!
            do {
                executionLine = (executionLine + 1) % this.text.length;
            } while (!this.text[executionLine]);
            if (this.text[executionLine]!.indent <= currentIndent) {
                throw new Error("INTERNAL ERROR: Expected indentation increase.");
            }
        } else {
            let found = false;
            do {
                // find a line to execute
                do {
                    executionLine = (executionLine + 1) % this.text.length;
                } while (!this.text[executionLine] || this.text[executionLine]!.indent > currentIndent);
                const line = this.text[executionLine];
                if (line && line.indent < currentIndent) {
                    // we just fell some distance - pop off the indent stack to figure out where from
                    // need to be careful here - if we fell more than one level, need to check ALL of them for while's
                    let levels = currentIndent - line.indent;
                    while (levels > 0) {
                        // for each level we fell, pop off the reason and check if we should go back (while)
                        const sourceNum = this.indentSourceStack.pop();
                        if (!sourceNum) {
                            throw new Error("INTERNAL ERROR: Corrupted indent stack.");
                        }
                        const source = this.text[sourceNum]!;
                        if (PT.ASTNode.isNodeWhile(source.ast)) {
                            // found a while statement - go to it
                            executionLine = sourceNum;
                            break;
                        } else if (source.indent === currentIndent - levels && PT.ASTNode.isNodeIf(source.ast) && PT.ASTNode.isNodeElse(line.ast)) {
                            // we were in an if, and we're pointing at the else - need to skip the else
                            // this changes where our true next line will be
                            // so, we need to restart iteration to skip over the else
                            currentIndent = line.indent; // by pretending to be it!
                            levels = -1; // and make sure we can detect this happened after this loop
                            break;
                        }
                        levels--;
                    }
                    // here, levels is < 0 if we want to skip the else and need to do more iteration
                    // so, if >= 0, that means we either saw something to jump back to (use) or we're good to fall off
                    if (levels >= 0) {
                        found = true;
                    }
                } else {
                    // on our same indent - easy!
                    found = true;
                }
            } while (!found);
        }

        // commit our new current line
        this.currentLine = executionLine;

        // prepare for next iteration
        this.shouldFollowIndent = false;
        this.jumpTo = undefined;
    }

    executeCurrentLine() {
        this.iters++;
        if (this.iters > MAX_ITERATIONS) {
            throw new Error(`Exceeded maximum iterations (${MAX_ITERATIONS}).`);
        }

        const line = this.text[this.currentLine];
        if (!line) {
            throw new Error("INTERNAL ERROR: Unexpected undefined line.");
        }

        if (PT.ASTNode.isNodeAssignment(line.ast)) {
            const slotLocation = this.getVarslotIndex(line.ast.varslot);
            const value = this.evalEquation(line.ast.equation);
            this.tape[slotLocation].value = value;
            this.animations.push({ type: LT.SpiderAnimationType.STORE, slot: slotLocation, n: value });
        } else if (PT.ASTNode.isNodeEquation(line.ast)) {
            this.evalEquation(line.ast);
        } else if (PT.ASTNode.isNodeIf(line.ast) || PT.ASTNode.isNodeWhile(line.ast)) {
            const eq = this.evalEquation(line.ast.equation);
            if (eq !== 0) {
                this.shouldFollowIndent = true;
            }
        } else if (PT.ASTNode.isNodeElse(line.ast)) {
            // we should not be evaluating the else at all if we're skipping it
            this.shouldFollowIndent = true;
        } else if (PT.ASTNode.isNodeFunccall(line.ast)) {
            this.callFunction(line.ast.func, line.ast.equation);
        } else if (PT.ASTNode.isNodeObjFunccall(line.ast)) {
            this.callObjFunction(line.ast.func, line.ast.object, line.ast.equation);
        } else if (PT.ASTNode.isNodeJump(line.ast)) {
            const node = line.ast; // TS doesn't like smart casting into the `find`
            this.jumpTo = this.labels.find((l) => l.name === node.destination)?.lineNumber;
        } else {
            throw new Error(`INTERNAL ERROR: Unrecognized root node on line ${this.currentLine}.`);
        }

        if (ALLOW_EARLY_FAIL) {
            // fail them early if they output something incorrect
            // we use a BenignHalt instead of Error because we want want to set the state to FAIL instead of ERROR
            const lastOutI = this.outputs.length - 1;
            if (lastOutI < this.test.expectedOutput.length && this.test.expectedOutput[lastOutI] != this.outputs[lastOutI]) {
                throw new BenignHalt(`Incorrect output: ${this.outputs[lastOutI]} (expected ${this.test.expectedOutput[lastOutI]}).`);
            } else if (lastOutI >= this.test.expectedOutput.length) {
                throw new BenignHalt(`Incorrect output: ${this.outputs[lastOutI]} (expected no additional output).`);
            }
        }
    }

    getPuzzleDataText(variables: LT.CustomSlot[]): string {
        let vars: string[]; // no default value: have the linter check that all paths assign

        // I know it sucks.

        if (!this.puzzle.canRenameSlots && !this.puzzle.canEditSlots) {
            // they aren't allowed to do anything - use the puzzle defaults
            if (!this.test.slotValues) {
                // all zeroed - just store names
                if (this.puzzle.defaultSlotNames) {
                    vars = this.puzzle.defaultSlotNames.map((n, i) => {
                        if (!n) {
                            return undefined; // don't actually have a name
                        }
                        return new LT.CustomSlot(i, n).toProgramText()
                    }).filter((x) => x !== undefined)
                } else {
                    // no names either? what, no variables in this puzzle?
                    vars = [];
                }
            } else {
                // we do have default slot values, so set them up
                vars = this.test.slotValues.map((v, i) => {
                    const n = this.puzzle.defaultSlotNames?.[i];
                    if (v === 0 && !n) {
                        return undefined; // it's pure default - don't bother adding it in
                    }
                    return new LT.CustomSlot(i, n ?? undefined, v).toProgramText()
                }).filter((s) => s !== undefined)
            }
        } else if (!this.puzzle.canRenameSlots) {
            // they can edit, but not rename - combine the lists
            if (!this.puzzle.defaultSlotNames) {
                // we don't have names either? this is weird - but we do have to keep their custom default values
                vars = variables.map((s) => new LT.CustomSlot(s.slot, undefined, s.value)).map((s) => s.toProgramText());
            } else {
                // keep if it has EITHER a defaultSlotNames name or a variables value
                vars = this.puzzle.defaultSlotNames.map((n, i) => {
                    const v = variables.find((s) => s.slot === i)?.value;
                    if ((!v || v === 0) && !n) {
                        return undefined; // it's pure default - don't bother adding it in
                    }
                    return new LT.CustomSlot(i, n ?? undefined, v).toProgramText();
                }).filter((x) => x !== undefined);
            }
        } else if (!this.puzzle.canEditSlots) {
            // they can rename, but not edit - combine the lists
            if (!this.test.slotValues) {
                // all-zero defaults, so just keep their names (preferring the user-entered one)
                if (this.puzzle.defaultSlotNames) {
                    vars = this.puzzle.defaultSlotNames.map((nd, i) => {
                        const s = variables.find((s) => s.slot === i);
                        if (!s && !nd) {
                            return undefined;
                        }
                        return new LT.CustomSlot(i, s?.name ?? nd ?? undefined).toProgramText();
                    }).filter((x) => x !== undefined);
                } else {
                    vars = variables.map((s) => new LT.CustomSlot(s.slot, s.name).toProgramText());
                }
            } else {
                // need to combine the slot values with their choices
                vars = this.test.slotValues.map((v, i) => {
                    const n = variables.find((s) => s.slot === i)?.name;
                    const nd = this.puzzle.defaultSlotNames?.[i];
                    if (v === 0 && !n && !nd) {
                        return undefined; // it's pure default - don't bother adding it in
                    }
                    return new LT.CustomSlot(i, n ?? nd ?? undefined, v).toProgramText();
                }).filter((x) => x !== undefined);
            }
        } else {
            // they have complete control - figure out what they want to use, but might still have default/backup names
            if (this.puzzle.defaultSlotNames) {
                vars = this.puzzle.defaultSlotNames.map((nd, i) => {
                    const s = variables.find((s) => s.slot === i);
                    if (!s && !nd) {
                        return undefined;
                    }
                    return new LT.CustomSlot(i, s?.name ?? nd ?? undefined, s?.value).toProgramText();
                }).filter((x) => x !== undefined);
            } else {
                vars = variables.map((v) => v.toProgramText());
            }
        }

        const objs = this.test.objects.map((o) => o.toProgramText());

        return `${objs.join("\n")}\n${vars.join("\n")}`;
    }

    getVarslotIndex(varslot: PT.ASTVarslot): number {
        const root = this.tape.findIndex((s) => s.name === varslot.identifier);
        const offset = varslot.offset ? this.evalEquation(varslot.offset) : 0;
        const index = root + offset;
        if (index < 0 || index >= this.tape.length) {
            throw new Error(`Slot ${index} (${varslot.identifier}[${offset}]) out of bounds.`);
        }
        return index;
    }

    evalEquation(node: PT.ASTNode): number {
        if (PT.ASTNode.isNodeEquation(node)) {
            return this.evalEquationEqNode(node);
        } else if (PT.ASTNode.isNodeNumber(node)) {
            return node.value;
        } else if (PT.ASTNode.isNodeVarslot(node)) {
            const slot = this.getVarslotIndex(node);
            const value = this.tape[slot].value;
            this.animations.push({ type: LT.SpiderAnimationType.LOAD, n: value, slot: slot });
            return value;
        } else if (PT.ASTNode.isNodeFunccall(node)) {
            return this.callFunction(node.func, node.equation);
        } else if (PT.ASTNode.isNodeObjFunccall(node)) {
            return this.callObjFunction(node.func, node.object, node.equation);
        } else {
            throw new Error(`INTERNAL ERROR: Unrecognized equation node type.`);
        }
    }

    evalEquationEqNode(node: PT.ASTEquation): number {
        // note: never evaluate a side more than once, as they may have side effects
        const op = node.eq.operator;
        const left = this.evalEquation(node.eq.left);
        if (node.eq.unary) {
            let result: number;
            switch (op) {
                case "-":
                    result = -1 * left;
                    break;
                case "!":
                    result = left === 0 ? 1 : 0;
                    break;
                default:
                    throw new Error(`INTERNAL ERROR: Unrecognized unary operator ${op}`);
            }
            this.animations.push({ type: LT.SpiderAnimationType.MATH_UNARY, result: 0, operator: op, value: left });
            return result;
        } else {
            // get this out of the way since they can short circuit
            if (op === "&&" && left === 0) {
                this.animations.push({ type: LT.SpiderAnimationType.MATH_SHORTED, result: 0, operator: op, left: left });
                return 0;
            }
            // the other short-circuit candidate
            else if (op === "||" && left !== 0) {
                this.animations.push({ type: LT.SpiderAnimationType.MATH_SHORTED, result: 1, operator: op, left: left });
                return 1;
            } else {
                const right = this.evalEquation(node.eq.right);
                let result: number;
                switch (op) {
                    case "+":
                        result = this.wrapNumber(left + right);
                        break;
                    case "-":
                        result = this.wrapNumber(left - right);
                        break;
                    case "*":
                        result = this.wrapNumber(left * right);
                        break;
                    case "/": {
                        if (right === 0) {
                            throw new Error("Division by zero.");
                        }
                        result = this.wrapNumber(Math.floor(left / right));
                        break;
                    }
                    case "%": {
                        if (right === 0) {
                            throw new Error("Modulus by zero.");
                        }
                        result = this.wrapNumber(left % right);
                        break;
                    }
                    case ">":
                        result = left > right ? 1 : 0;
                        break;
                    case ">=":
                        result = left >= right ? 1 : 0;
                        break;
                    case "==":
                        result = left == right ? 1 : 0;
                        break;
                    case "!=":
                        result = left != right ? 1 : 0;
                        break;
                    case "<=":
                        result = left <= right ? 1 : 0;
                        break;
                    case "<":
                        result = left < right ? 1 : 0;
                        break;
                    case "&&":
                        result = right === 0 ? 0 : 1;
                        break;
                    case "||":
                        result = right === 0 ? 0 : 1;
                        break;
                    default:
                        throw new Error(`INTERNAL ERROR: Unrecognized operator ${op}`);
                }
                this.animations.push({ type: LT.SpiderAnimationType.MATH, result: result, operator: op, left: left, right: right });
                return result;
            }
        }
    }

    wrapNumber(value: number): number {
        while (value > 999) {
            value -= 1999;
        }
        while (value < -999) {
            value += 1999;
        }
        return value;
    }

    callFunction(funcname: string, arg: PT.ASTNode | undefined): number {
        if (arg) {
            if (funcname === "output") {
                const v = this.evalEquation(arg);
                this.outputs.push(v);
                this.animations.push({ type: LT.SpiderAnimationType.OUTPUT, n: v });
                return 0;
            }
        } else {
            if (funcname === "input") {
                const v = this.inputs.shift();
                if (!v) {
                    throw new BenignHalt("No inputs remaining.");
                }
                this.animations.push({ type: LT.SpiderAnimationType.INPUT, n: v });
                return v;
            } else if (funcname === "end") {
                throw new BenignHalt("Halted normally.");
            }
        }
        throw new Error(`INTERNAL ERROR: Unknown function ${funcname}.`);
    }

    callObjFunction(funcname: string, objname: string, arg: PT.ASTNode | undefined): number {
        const obj = this.objs.find((o) => o.name === objname);
        if (!obj) {
            throw new Error(`INTERNAL ERROR: Unknown object ${objname}.`)
        }
        if (arg) {
            const argVal = this.evalEquation(arg);
            if (obj.type === "stack" && funcname === "push") {
                obj.contents.push(argVal);
                this.animations.push({ type: LT.SpiderAnimationType.OBJ_PUSH, object: objname, n: argVal, index: obj.contents.length - 1 });
                return 0;
            } else if (obj.type === "queue" && funcname === "enqueue") {
                obj.contents.push(argVal);
                this.animations.push({ type: LT.SpiderAnimationType.OBJ_PUSH, object: objname, n: argVal, index: obj.contents.length - 1 });
                return 0;
            }
        } else {
            if (obj.type === "cmd" && funcname === "next") {
                const v = obj.contents.shift();
                if (!v) {
                    throw new BenignHalt(`No next in ${obj.name}.`);
                }
                return v;
            } else if (obj.type === "stack") {
                if (funcname === "pop") {
                    const v = obj.contents.pop();
                    if (!v) {
                        throw new Error(`${obj.name} is empty.`);
                    }
                    this.animations.push({ type: LT.SpiderAnimationType.OBJ_TAKE, object: objname, n: v, index: obj.contents.length });
                    return v;
                } else if (funcname === "length") {
                    const v = obj.contents.length;
                    this.animations.push({ type: LT.SpiderAnimationType.OBJ_EXAMINE, object: objname, n: v });
                    return v;
                }
            } else if (obj.type === "queue") {
                if (funcname === "dequeue") {
                    const v = obj.contents.shift();
                    if (!v) {
                        throw new Error(`${obj.name} is empty.`);
                    }
                    this.animations.push({ type: LT.SpiderAnimationType.OBJ_TAKE, object: objname, n: v, index: 0 });
                    return v;
                } else if (funcname === "length") {
                    const v = obj.contents.length;
                    this.animations.push({ type: LT.SpiderAnimationType.OBJ_EXAMINE, object: objname, n: v });
                    return v;
                }
            }
        }
        throw new Error(`INTERNAL ERROR: Unknown object function ${objname}.${funcname}.`);
    }
}
