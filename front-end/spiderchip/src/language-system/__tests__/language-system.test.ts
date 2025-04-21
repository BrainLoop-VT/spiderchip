import * as LT from "../ls-interface-types";
import createRuntime from "../ls-system";

const puzzlePipeCases = [new LT.PuzzleTest([], null, [1, 2, 3], [1, 2, 3]), new LT.PuzzleTest([], null, [4, 5], [4, 5])];
const puzzlePipe = new LT.Puzzle(5, puzzlePipeCases, null, true, true);

const puzzleAllObjsCases = [new LT.PuzzleTest([
    new LT.SpiderObject("cmd", "cmd", [1, 2, 3]),
    new LT.SpiderObject("stack", "s", [4, 5, 6]),
    new LT.SpiderObject("queue", "q", [3, 2, 1]),
], null, [3], [3])];
const puzzleAllObjs = new LT.Puzzle(5, puzzleAllObjsCases, null, true, true);

// concatenate lines of code - ex: `toCodeLines("if (x == 2):", "output(x)")`
const toCodeLines = (...lines: string[]) => lines.join("\n");

// initializes and executes once, then returns the value of the first varslot
const checkEquation = (rt: LT.SpiderRuntime, slots: LT.CustomSlot[], eq: string) => {
    rt.init(eq, slots, 0);
    rt.step();
    return rt.state().varslots[0].value;
}

test("instant no-code state works", () => {
    const rt = createRuntime(puzzlePipe);
    rt.init("", [], 1);
    const state = rt.state();

    expect(state.state).toBe(LT.SpiderStateEnum.NEW);
    expect(state.line).toBe(0);
    expect(state.objs.length).toBe(0);
    expect(state.input).toEqual(puzzlePipeCases[1].inputQueue);
    expect(state.output).toEqual([]);
    expect(state.varslots).toEqual(Array(puzzlePipe.slotCount).fill(new LT.SpiderSlot(0, "")));
});

test("rename and edit system works", () => {
    const puzzleInitCases = [new LT.PuzzleTest([], [1, 2], [1, 2, 3], [1, 2, 3]), new LT.PuzzleTest([], [3, 4], [4, 5], [4, 5])];

    // NB: allowing editing means that default values are IGNORED
    const puzzleInit = new LT.Puzzle(2, puzzleInitCases, ["a"], true, true);
    const puzzleInitNoRename = new LT.Puzzle(2, puzzleInitCases, ["a"], true, false);
    const puzzleInitNoEdit = new LT.Puzzle(2, puzzleInitCases, ["a"], false, true);
    const puzzleInitNoNothing = new LT.Puzzle(2, puzzleInitCases, ["a"], false, false);

    const rt = createRuntime(puzzleInit);
    rt.init("", [new LT.CustomSlot(0, "b", 100)], 0);
    const rtState = rt.state();
    expect(rtState.varslots).toEqual([new LT.SpiderSlot(100, "b"), new LT.SpiderSlot(0, "")]);

    const rtNR = createRuntime(puzzleInitNoRename);
    rtNR.init("", [new LT.CustomSlot(0, "b", 100)], 0);
    const rtNRState = rtNR.state();
    expect(rtNRState.varslots).toEqual([new LT.SpiderSlot(100, "a"), new LT.SpiderSlot(0, "")]);

    const rtNE = createRuntime(puzzleInitNoEdit);
    rtNE.init("", [new LT.CustomSlot(0, "b", 100)], 0);
    const rtNEState = rtNE.state();
    expect(rtNEState.varslots).toEqual([new LT.SpiderSlot(1, "b"), new LT.SpiderSlot(2, "")]);

    const rtNN = createRuntime(puzzleInitNoNothing);
    rtNN.init("", [new LT.CustomSlot(0, "b", 100)], 0);
    const rtNNState = rtNN.state();
    expect(rtNNState.varslots).toEqual([new LT.SpiderSlot(1, "a"), new LT.SpiderSlot(2, "")]);
});

test("linter errors work", () => {
    // we don't care specifically what the message is, just that it fails

    // setup
    const puzzleStackCase = [new LT.PuzzleTest([new LT.SpiderObject("stack", "s", [])], null, [1, 2], [2, 1])];
    const puzzleStack = new LT.Puzzle(2, puzzleStackCase);
    const rt = createRuntime(puzzleStack);
    let state: LT.SpiderState;
    let lint: LT.SpiderError[];

    // label doesn't end line
    rt.init("a: yes", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // duplicate label
    rt.init(toCodeLines("a: # yes", "a: # no"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(2);

    // expected indentation increase
    rt.init(toCodeLines("if (x == 2):", "x = 2"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(2);

    // unexpected indentation increase
    rt.init(toCodeLines("x = 2", "  x = 2"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(2);

    // invalid indentation pattern (e.g. indent with 4 spaces, but then have an indent of 2)
    rt.init(toCodeLines("if (x == 2):", "    x[1] = 2", "  x[1] = 3"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(3);

    // assignment without =
    rt.init("x 2", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // missing argument
    rt.init("output()", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // equation with no content in parentheses
    rt.init("x = ()", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // equation with no content in parentheses the second
    rt.init(toCodeLines("if ():", "  x = 1"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // if statement with extra text
    rt.init("if (1 == 2): gaming", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // if with no (
    rt.init(toCodeLines("if [x == 2]:", "  x = 1"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // if with no :
    rt.init(toCodeLines("if (x == 2)", "  x = 1"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // while with no (
    rt.init(toCodeLines("while [x == 2]:", "  x = 1"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // while with no :
    rt.init(toCodeLines("while (x == 2)", "  x = 1"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // else without if
    rt.init(toCodeLines("else:", "  x = 1"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // else with out if the second (closed if)
    rt.init(toCodeLines("if (x == 2):", "  x = 1", "x = 3", "else:", "x = 4"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(4);

    // jump with no label
    rt.init("jump", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // jump with invalid label
    rt.init("jump s", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // label in equation
    rt.init(toCodeLines("a:", "x = a"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(2);

    // solo label (e.g. just "a" on its own instead of "jump a")
    rt.init(toCodeLines("a:", "a"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(2);

    // function without (
    rt.init(toCodeLines("x = input", "output x"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);
    expect(lint[1].line).toBe(2);

    // object function without period
    rt.init("s(x)", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // object function without name
    rt.init("s.(x)", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // object function with invalid name
    rt.init("s.enqueue(x)", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // object function without (
    rt.init("s.push x", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // number less than -999
    rt.init("x = -1000", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // number greater than 999
    rt.init("x = 1000", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // two arguments in a row
    rt.init("x = 1 1", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // two operands in a row (- is allowed due to unary)
    rt.init("x = 1 + + 1", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);

    // missing ) in equation
    rt.init("x = (1 + 1", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    lint = rt.lint();
    expect(state.state).toBe(LT.SpiderStateEnum.INVALID);
    expect(lint[0].line).toBe(1);
});

test("basic output test passing works", () => {
    const rt = createRuntime(puzzlePipe);
    // this is a correct solution
    rt.init(toCodeLines("x = input()", "output(x)"), [new LT.CustomSlot(0, "x")], 0);

    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    // iterate through, expecting that the state is reflecting the input queue we should be having
    const inputs = puzzlePipeCases[0].inputQueue.slice();
    let flip = false;
    do {
        rt.step();
        state = rt.state();
        flip = !flip;
        if (flip) {
            inputs.shift();
            expect(state.line).toBe(1);
        } else {
            expect(state.line).toBe(2);
        }
        expect(state.input).toEqual(inputs);
    } while (state.state === LT.SpiderStateEnum.RUNNING);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.SUCCESS);
    expect(state.output).toEqual(puzzlePipeCases[0].expectedOutput);
});

test("basic slot value test passing works", () => {
    const puzzleSlotValues = new LT.Puzzle(3, [new LT.PuzzleTest([], null, [], [], [1, 2, 3])]);
    const rt = createRuntime(puzzleSlotValues);
    rt.init(toCodeLines("x[0] = 1", "x[1] = 2", "x[2] = 3", "end()"), [new LT.CustomSlot(0, "x")], 0);

    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.step();
    rt.step();
    rt.step();
    rt.step();

    state = rt.state();
    expect(state.line).toBe(4);
    expect(state.state).toBe(LT.SpiderStateEnum.SUCCESS);
});

test("basic output test failing works", () => {
    const rt = createRuntime(puzzlePipe);
    rt.init("x = input()", [new LT.CustomSlot(0, "x")], 0);
    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    // consume all of the data
    for (let i = 0; i < puzzlePipeCases[0].inputQueue.length; i++) {
        rt.step();
        state = rt.state();
        expect(state.state).toBe(LT.SpiderStateEnum.RUNNING);
    }

    // this step should fail it
    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.FAIL);
    expect(state.error).toBeDefined();
});

test("basic slot value test failing works", () => {
    const puzzleSlotValues = new LT.Puzzle(3, [new LT.PuzzleTest([], null, [], [], [1, 2, 3])]);
    const rt = createRuntime(puzzleSlotValues);
    rt.init(toCodeLines("x[0] = 3", "x[1] = 2", "x[2] = 1", "end()"), [new LT.CustomSlot(0, "x")], 0);

    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.step();
    rt.step();
    rt.step();
    rt.step();

    state = rt.state();
    expect(state.line).toBe(4);
    expect(state.state).toBe(LT.SpiderStateEnum.FAIL);
    expect(state.error).toBeDefined();
});

test("basic test dubious failing works", () => {
    const rt = createRuntime(puzzlePipe);
    // a cheesy solution that just hard-codes the first one
    const lines = puzzlePipeCases[0].expectedOutput.map((v) => `output(${v})`);
    rt.init(toCodeLines(...lines, "end()"), [new LT.CustomSlot(0, "x")], 0);
    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    do {
        rt.step();
        state = rt.state();
    } while (state.state === LT.SpiderStateEnum.RUNNING);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(puzzlePipeCases[0].expectedOutput.length + 1);
    expect(state.state).toBe(LT.SpiderStateEnum.DUBIOUS);
    expect(state.output).toEqual(puzzlePipeCases[0].expectedOutput);
    expect(state.failedCase).toBeDefined();
});

test("invalid output failing works", () => {
    const rt = createRuntime(puzzlePipe);
    rt.init(toCodeLines(`output(${puzzlePipeCases[0].expectedOutput[0]})`, "output(100)"), [new LT.CustomSlot(0, "x")], 0);
    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    // first output is correct
    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.RUNNING);
    expect(state.output).toEqual([puzzlePipeCases[0].expectedOutput[0]]);

    // now we fail
    rt.step();
    state = rt.state();
    expect(state.line).toBe(2);
    expect(state.state).toBe(LT.SpiderStateEnum.FAIL); // specifically not ERROR
    expect(state.output).toEqual([puzzlePipeCases[0].expectedOutput[0], 100]);
});

test("crashing errors work", () => {
    // setup
    const rt = createRuntime(puzzlePipe);
    let state: LT.SpiderState;

    // division by zero
    rt.init("x = 1 / 0", [new LT.CustomSlot(0, "x")], 0);
    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.ERROR);
    expect(state.error).toBeDefined();

    // modulus by zero
    rt.init("x = 1 % 0", [new LT.CustomSlot(0, "x")], 0);
    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.ERROR);
    expect(state.error).toBeDefined();

    // out of bounds access
    rt.init("x = x[100]", [new LT.CustomSlot(0, "x")], 0);
    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.ERROR);
    expect(state.error).toBeDefined();

    // exceed iteration count
    rt.init(toCodeLines("a:", "x = 1", "jump a"), [new LT.CustomSlot(0, "x")], 0);
    do {
        rt.step();
        state = rt.state();
    } while (state.state === LT.SpiderStateEnum.RUNNING);
    expect(state.state).toBe(LT.SpiderStateEnum.ERROR);
    expect(state.error).toBeDefined();
});

test("basic builtin functions work", () => {
    const rt = createRuntime(puzzlePipe);
    rt.init(toCodeLines("x = input()", "output(x)", "end()"), [new LT.CustomSlot(0, "x", 5)], 0);
    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.RUNNING);
    expect(state.output.length).toBe(0);
    expect(state.varslots[0].value).toBe(puzzlePipeCases[0].inputQueue[0]);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(2);
    expect(state.state).toBe(LT.SpiderStateEnum.RUNNING);
    expect(state.output.length).toBe(1);
    expect(state.output[0]).toBe(state.varslots[0].value);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(3);
    expect(state.state).toBe(LT.SpiderStateEnum.FAIL);
    expect(state.output.length).toBe(1);
    expect(state.varslots[0].value).toBe(puzzlePipeCases[0].inputQueue[0]);
});

test("basic stack object works", () => {
    const puzzleStackCase = [new LT.PuzzleTest([new LT.SpiderObject("stack", "s", [])], null, [1, 2], [2, 1])];
    const puzzleStack = new LT.Puzzle(2, puzzleStackCase, null, true);

    const rt = createRuntime(puzzleStack);
    rt.init(toCodeLines("while (x > 0):",
        "  s.push(input())",
        "  y = s.length()",
        "  x = x - 1",
        "x = 2",
        "while (x > 0):",
        "  output(s.pop())",
        "  x = x - 1",
        "y = s.length()",
        "end()"),
        [new LT.CustomSlot(0, "x", 2), new LT.CustomSlot(1, "y")], 0);
    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.step();
    rt.step();
    state = rt.state();
    expect(state.line).toBe(2);
    expect(state.objs[0].contents).toEqual([1]);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(3);
    expect(state.varslots[1].value).toEqual(1);

    rt.step();
    rt.step();
    rt.step();
    state = rt.state();
    expect(state.line).toBe(2);
    expect(state.objs[0].contents).toEqual([1, 2]);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(3);
    expect(state.varslots[1].value).toEqual(2);

    do {
        rt.step();
        state = rt.state();
    } while (state.state === LT.SpiderStateEnum.RUNNING);

    expect(state.line).toBe(10);
    expect(state.varslots[1].value).toEqual(0);
    expect(state.state).toBe(LT.SpiderStateEnum.SUCCESS);
    expect(state.output).toEqual(puzzleStackCase[0].expectedOutput);
});

test("basic queue object works", () => {
    const puzzleQueueCase = [new LT.PuzzleTest([new LT.SpiderObject("queue", "q", [])], null, [1, 2], [1, 2])];
    const puzzleQueue = new LT.Puzzle(2, puzzleQueueCase, null, true);

    const rt = createRuntime(puzzleQueue);
    rt.init(toCodeLines("while (x > 0):",
        "  q.enqueue(input())",
        "  y = q.length()",
        "  x = x - 1",
        "x = 2",
        "while (x > 0):",
        "  output(q.dequeue())",
        "  x = x - 1",
        "y = q.length()",
        "end()"),
        [new LT.CustomSlot(0, "x", 2), new LT.CustomSlot(1, "y")], 0);
    let state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.step();
    rt.step();
    state = rt.state();
    expect(state.line).toBe(2);
    expect(state.objs[0].contents).toEqual([1]);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(3);
    expect(state.varslots[1].value).toEqual(1);

    rt.step();
    rt.step();
    rt.step();
    state = rt.state();
    expect(state.line).toBe(2);
    expect(state.objs[0].contents).toEqual([1, 2]);

    rt.step();
    state = rt.state();
    expect(state.line).toBe(3);
    expect(state.varslots[1].value).toEqual(2);

    do {
        rt.step();
        state = rt.state();
    } while (state.state === LT.SpiderStateEnum.RUNNING);

    expect(state.line).toBe(10);
    expect(state.state).toBe(LT.SpiderStateEnum.SUCCESS);
    expect(state.varslots[1].value).toEqual(0);
    expect(state.output).toEqual(puzzleQueueCase[0].expectedOutput);
});

test("basic cmd object works", () => {
    const puzzleCmd = new LT.Puzzle(5, [new LT.PuzzleTest([new LT.SpiderObject("cmd", "cmd", [1, 2, 3])], null, [], [1, 2, 3])]);
    const rt = createRuntime(puzzleCmd);
    let state: LT.SpiderState;

    // this is a correct solution
    rt.init(toCodeLines("x = cmd.next()", "output(x)"), [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);
    do {
        rt.step();
        state = rt.state();
    } while (state.state === LT.SpiderStateEnum.RUNNING);
    rt.step();
    state = rt.state();
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.SUCCESS);
    expect(state.output).toEqual([1, 2, 3]);

    // this is an incorrect solution
    rt.init("x = cmd.next()", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);
    do {
        rt.step();
        state = rt.state();
    } while (state.state === LT.SpiderStateEnum.RUNNING);
    expect(state.line).toBe(1);
    expect(state.state).toBe(LT.SpiderStateEnum.FAIL);

});

test("simple equations work", () => {
    const rt = createRuntime(puzzleAllObjs);
    let slots: LT.CustomSlot[];

    slots = [new LT.CustomSlot(0, "x", 3), new LT.CustomSlot(1, "y", 2)];
    expect(checkEquation(rt, slots, "x = x * y")).toBe(6);
    expect(checkEquation(rt, slots, "x = x / y")).toBe(1);
    expect(checkEquation(rt, slots, "x = x % y")).toBe(1);
    expect(checkEquation(rt, slots, "x = x + y")).toBe(5);
    expect(checkEquation(rt, slots, "x = x - y")).toBe(1);

    slots = [new LT.CustomSlot(0, "x", -2), new LT.CustomSlot(1, "y", -9)];
    expect(checkEquation(rt, slots, "x = x * y")).toBe(18);
    expect(checkEquation(rt, slots, "x = x / y")).toBe(0);
    expect(checkEquation(rt, slots, "x = x % y")).toBe(-2);
    expect(checkEquation(rt, slots, "x = x + y")).toBe(-11);
    expect(checkEquation(rt, slots, "x = x - y")).toBe(7);

    slots = [new LT.CustomSlot(0, "x")];
    expect(checkEquation(rt, slots, "x = 2 > 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 1 > 2")).toBe(0);
    expect(checkEquation(rt, slots, "x = 1 > 1")).toBe(0);
    expect(checkEquation(rt, slots, "x = 2 >= 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 1 >= 2")).toBe(0);
    expect(checkEquation(rt, slots, "x = 1 >= 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 2 == 1")).toBe(0);
    expect(checkEquation(rt, slots, "x = 1 == 2")).toBe(0);
    expect(checkEquation(rt, slots, "x = 1 == 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 2 <= 1")).toBe(0);
    expect(checkEquation(rt, slots, "x = 1 <= 2")).toBe(1);
    expect(checkEquation(rt, slots, "x = 1 <= 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 2 < 1")).toBe(0);
    expect(checkEquation(rt, slots, "x = 1 < 2")).toBe(1);
    expect(checkEquation(rt, slots, "x = 1 < 1")).toBe(0);

    expect(checkEquation(rt, slots, "x = 1 && 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 1 && 0")).toBe(0);
    expect(checkEquation(rt, slots, "x = 0 && 1")).toBe(0);
    expect(checkEquation(rt, slots, "x = 0 && 0")).toBe(0);
    expect(checkEquation(rt, slots, "x = 1 || 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 1 || 0")).toBe(1);
    expect(checkEquation(rt, slots, "x = 0 || 1")).toBe(1);
    expect(checkEquation(rt, slots, "x = 0 || 0")).toBe(0);

    expect(checkEquation(rt, slots, "x = 4 * 5")).toBe(20);
    expect(checkEquation(rt, slots, "x = 9 * -2")).toBe(-18);
    expect(checkEquation(rt, slots, "x = 11 * 0")).toBe(0);
    expect(checkEquation(rt, slots, "x = 9 / 3")).toBe(3);
    expect(checkEquation(rt, slots, "x = 6 / 2")).toBe(3);
    expect(checkEquation(rt, slots, "x = -26 / 13")).toBe(-2);
    expect(checkEquation(rt, slots, "x = 0 / 13")).toBe(0);
});

test("complex equations work", () => {
    const rt = createRuntime(puzzleAllObjs);
    const slots = [new LT.CustomSlot(0, "x", 3), new LT.CustomSlot(1, "y", 2)];
    let state: LT.SpiderState;

    // NB: q contains [3,2,1], s contains [4,5,6], cmd contains [1,2,3]

    expect(checkEquation(rt, slots, "x = s.pop() * (3 + 1)")).toBe(24);
    expect(checkEquation(rt, slots, "x = s.push(2) || 3")).toBe(1); // implicit 0 return
    expect(checkEquation(rt, slots, "x = ((((((3))))) * 2) + q.dequeue() * 3")).toBe(15);
    expect(checkEquation(rt, slots, "x = -x + !!y")).toBe(-2);
    expect(checkEquation(rt, slots, "x = !y * 2")).toBe(0);

    // ensure short circuiting on and
    rt.init("x = 0 && output(100)", slots, 0);
    rt.step();
    state = rt.state();
    expect(state.varslots[0].value).toBe(0);
    expect(state.output.length).toBe(0);

    // ensure short circuiting on or
    rt.init("x = 3 || output(100)", slots, 0);
    rt.step();
    state = rt.state();
    expect(state.varslots[0].value).toBe(1);
    expect(state.output.length).toBe(0);
});

test("complex branching works", () => {
    const rt = createRuntime(puzzlePipe);
    rt.init(toCodeLines(
/* 1 */ "while (x > 0):",
        "  if (x > 1):",
        "      x = 1",
        "  else:",
/* 5 */ "   x = x - 1",
        "x = 2",
        "while (x > 0):",
        " a:",
        " while(x > 100):",
/* 10 */"  if (x < 999):",
        "      end()",
        "  else:",
        "     x = 9",
        "  end()",
/* 15 */" x = x - 1",
        "x = 999",
        "if (x == 999):",
        "  x = 999",
        "else:",
/* 20 */"  x = 0",
        "jump a"),
        [new LT.CustomSlot(0, "x", 2)], 0);
    expect(rt.state().state).toBe(LT.SpiderStateEnum.NEW);

    rt.step();
    expect(rt.state().line).toBe(1); // while (x > 0)
    rt.step();
    expect(rt.state().line).toBe(2); // 1> if (x > 1)
    rt.step();
    expect(rt.state().line).toBe(3); // 2> x = 1
    rt.step();
    expect(rt.state().line).toBe(1); // while (x > 0)
    rt.step();
    expect(rt.state().line).toBe(2); // 1> if (x > 1)
    rt.step();
    expect(rt.state().line).toBe(4); // 1> else
    rt.step();
    expect(rt.state().line).toBe(5); // 2> x = x - 1
    rt.step();
    expect(rt.state().line).toBe(1); // while (x > 0)
    rt.step();
    expect(rt.state().line).toBe(6); // x = 2
    rt.step();
    expect(rt.state().line).toBe(7); // while (x > 0)
    rt.step();
    expect(rt.state().line).toBe(9); // 1> while (x > 100)
    rt.step();
    expect(rt.state().line).toBe(15); // 1> x = x -1
    rt.step();
    expect(rt.state().line).toBe(7); // while (x > 0)
    rt.step();
    expect(rt.state().line).toBe(9); // 1> while (x > 100)
    rt.step();
    expect(rt.state().line).toBe(15); // 1> x = x -1
    rt.step();
    expect(rt.state().line).toBe(7); // while (x > 0)
    rt.step();
    expect(rt.state().line).toBe(16); // x = 999
    rt.step();
    expect(rt.state().line).toBe(17); // if (x == 999)
    rt.step();
    expect(rt.state().line).toBe(18); // 1> x = 999
    rt.step();
    expect(rt.state().line).toBe(21); // jump a
    rt.step();
    expect(rt.state().line).toBe(9); // 1> while (x > 100)
    rt.step();
    expect(rt.state().line).toBe(10); // 2> if (x < 100)
    rt.step();
    expect(rt.state().line).toBe(12); // 2> else
    rt.step();
    expect(rt.state().line).toBe(13); // 3> x = 9
    rt.step();
    const finalState = rt.state();
    expect(finalState.line).toBe(14); // 2> end()
    expect(finalState.state).toBe(LT.SpiderStateEnum.FAIL);
});

test("equation-only lines work", () => {
    const puzzleStackCase = [new LT.PuzzleTest([new LT.SpiderObject("stack", "s", [])], null, [1, 2], [2, 1])];
    const puzzleStack = new LT.Puzzle(2, puzzleStackCase, null, true, true);
    const rt = createRuntime(puzzleStack);
    let state: LT.SpiderState;

    rt.init("1 + 2", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.init("output(x) + 1", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.init("1 + !output(x)", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.init("!output(x)", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.init("s.push(input()) + 2 - output(x) + !x", [new LT.CustomSlot(0, "x")], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);

    rt.init("x + output(x)", [new LT.CustomSlot(0, "x", 2)], 0);
    state = rt.state();
    expect(state.state).toBe(LT.SpiderStateEnum.NEW);
    rt.step();
    state = rt.state();
    expect(state.output[0]).toBe(2);
});
