import * as PT from "./parser-types";

export default parse;

const RE_EOL = /$/;
const RE_WS = /[ \t]+/;
const RE_WS_OPT = /[ \t]*/;
const RE_EMPTY = /^[ \t]*(#.*)?$/;
const RE_COLON = /:/;
const RE_PERIOD = /\./;
const RE_EQU = /=/;
const RE_BRACKET_OPEN = /\[/;
const RE_BRACKET_CLOSE = /\]/;
const RE_PAREN_OPEN = /\(/;
const RE_PAREN_CLOSE = /\)/;
const RE_OPERATOR = /(>(?!=)|>=|==|!=|<=|<(?!=)|&&|\|\||[*/%+-])/;
const RE_UNARY_OPERATOR = /(-(?!\d)|!(?!=))/;
const RE_NUMBER = /-?\d{1,3}/;
const RE_IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/;

// ordered based on the binding strength from weakest to strongest
const OPERATOR_BINDING_GROUPS = [["||"], ["&&"], [">=", ">", "==", "!=", "<=", "<"], ["+", "-"], ["*", "/", "%"]];

const ObjectType = {
    CMD: "cmd",
    STACK: "stack",
    QUEUE: "queue"
};

// function entries are name: argcount
const SUPPORTED_OBJS = {
    [ObjectType.CMD]: { next: 0 },
    [ObjectType.STACK]: { push: 1, pop: 0, length: 0 },
    [ObjectType.QUEUE]: { enqueue: 1, dequeue: 0, length: 0 }
};
const SUPPORTED_FUNCS = { input: 0, output: 1, end: 0 };
const RESERVED_KEYWORDS = ["if", "else", "while", "jump"];

function parse(text: string): PT.ParseResult {
    const lines = text.replace("\r", "").split("\n");
    const result = new PT.ParseResult();

    // sanity checks
    if (lines.length < 4) {
        result.errors.push(new PT.ErrorMessage(0, `Too short to be a Spider program.`));
        result.valid = false;
        return result;
    } else if (lines[0] !== "SPDR PROGRAM") {
        result.errors.push(new PT.ErrorMessage(1, `Not a Spider program.`));
        result.valid = false;
        return result;
    } else if (lines[1] !== ".data") {
        result.errors.push(new PT.ErrorMessage(2, `Expected .data segment on line 2.`));
        result.valid = false;
        return result;
    }

    // find the start of the .text segment
    let textStart = -1;
    let duplicateText = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === ".text") {
            if (textStart > -1) {
                duplicateText = i;
                break;
            } else {
                textStart = i;
            }
        }
    }
    if (textStart == -1) {
        result.errors.push(new PT.ErrorMessage(0, `Missing .text segment.`));
        result.valid = false;
        return result;
    } else if (duplicateText != -1) {
        result.errors.push(new PT.ErrorMessage(duplicateText, `Duplicate .text segment.`));
        result.valid = false;
        return result;
    }

    /* parse the data segment */

    let curLine = 2; // curLine refers to the line index (the "true" line number is +1)

    // we start with creating the variable tape
    const tapeRegex = lines[curLine].match(/^tapelength[ \t]+(?<length>\d{1,3})$/);
    if (tapeRegex === null) {
        result.errors.push(new PT.ErrorMessage(curLine + 1, `Missing or invalid tapelength.`));
        result.valid = false;
        return result;
    }
    result.data.tape = Array.from({ length: Number.parseInt(tapeRegex.groups?.length ?? "0") }, () => (new PT.Slot()));

    // now parse the rest of the data segment 
    curLine++;
    while (curLine < textStart) {
        const line = cleanup(lines[curLine])
        if (!line.match(RE_EMPTY)) {
            parseDataLine(line, curLine + 1, result);
        }
        curLine++;
    }

    /* parse the text segment */

    curLine++; // skip ".text" line itself
    const textStartIndex = curLine;

    // preprocess labels
    const labelLines: number[] = []
    for (; curLine < lines.length; curLine++) {
        const line = cleanup(lines[curLine])
        if (!line.match(RE_EMPTY)) {
            if (parseTextLabelLine(line, curLine - textStartIndex + 1, result)) {
                labelLines.push(curLine);
            }
        }
    }

    // now parse the actual text, skipping labels
    const indentTracking = new IndentTracker();
    for (curLine = textStartIndex; curLine < lines.length; curLine++) {
        if (labelLines.includes(curLine)) {
            continue;
        }
        const line = cleanup(lines[curLine])
        if (!line.match(RE_EMPTY)) {
            parseTextCodeLine(line, curLine - textStartIndex + 1, indentTracking, result);
        }
    }

    // parsing may return early in the presence of errors, having written it to this array
    // we still continue to parse the rest of the code (for linting reasons), but it isn't valid/runnable
    result.valid = result.errors.length === 0;

    return result;
}

class LineParse {
    line: string; // line being parsed
    matched: string = ""; // last-matched value (not updated on failure)
    pos: number = 0; // current position within parsed line (not updated on match fail)

    constructor(line: string) {
        this.line = line;
    }

    /**
     * Match a specific regex immediately at pos
     * If returned true, the matched result is in `this.matched`
     */
    match(regex: RegExp | string): boolean {
        const re = RegExp(regex, "y");
        re.lastIndex = this.pos;
        const result = re.exec(this.line);
        if (result) {
            this.pos = re.lastIndex;
            this.matched = result[0];
            return true;
        } else {
            return false;
        }
    }
}

/**
 * Clean up a string to prepare it for parsing.
 * Removes comment and trailing whitespace (after last token, RE_EOL matches).
 */
function cleanup(s: string): string {
    // all we need to do is remove the comments
    return s.split('#')[0].trimEnd();
}

enum IdentifierType {
    UNUSED,
    VAR,
    OBJ,
    FUNC,
    KEYWORD,
    LABEL
};

/**
 * Classify an identifier based on the current state of data.
 * Note that:
 *    - OBJ refers to the actual name of the object, not its type (they can be the same!).
 *    - FUNC refers to "root" functions, not object functions (see SUPPORTED_OBJS["objtype"]).
 */
function classifyIdentifier(data: PT.Data, name: string): IdentifierType {
    if (RESERVED_KEYWORDS.includes(name)) {
        return IdentifierType.KEYWORD;
    }
    if (data.tape.find((slot) => slot.name === name)) {
        return IdentifierType.VAR;
    }
    if (data.objects.find((obj) => obj.name === name)) {
        return IdentifierType.OBJ;
    }
    if (Object.keys(SUPPORTED_FUNCS).includes(name)) {
        return IdentifierType.FUNC;
    }
    if (data.labels.find((label) => label.name === name)) {
        return IdentifierType.LABEL;
    }
    return IdentifierType.UNUSED;
}

function parseDataLine(line: string, lnum: number, result: PT.ParseResult) {
    const parse = new LineParse(line);

    // varslot init/naming: number number | number identifier [ number ]
    if (parse.match(RE_NUMBER)) {
        // obtain the index (always present)
        const index = Number.parseInt(parse.matched);
        if (index < 0 || index >= result.data.tape.length) {
            result.errors.push(new PT.ErrorMessage(lnum, `Invalid index '${index}' for tape length '${result.data.tape.length}'.`));
            return;
        }
        // require whitespace before the next item
        if (!parse.match(RE_WS)) {
            result.errors.push(new PT.ErrorMessage(lnum, `Expected whitespace at position '${parse.pos}'.`));
            return;
        }
        // optional identifier name
        if (parse.match(RE_IDENTIFIER)) {
            if (classifyIdentifier(result.data, parse.matched) != IdentifierType.UNUSED) {
                result.errors.push(new PT.ErrorMessage(lnum, `Duplicate identifier '${parse.matched}'.`));
                // we don't actually want to stop parsing here: let the slot get that name, they fix it
            }
            result.data.tape[index].name = parse.matched;
            if (parse.match(RE_EOL)) {
                return; // no extra items, was just a name
            }
            // need whitespace to separate from initial value, which we expect since not EOL
            if (!parse.match(RE_WS)) {
                result.errors.push(new PT.ErrorMessage(lnum, `Expected whitespace at position '${parse.pos}'.`));
                return;
            }
        }
        // optional initial value
        if (parse.match(RE_NUMBER)) {
            result.data.tape[index].value = Number.parseInt(parse.matched);
        }
        // must be at end by now, error if not
        if (!parse.match(RE_EOL)) {
            result.errors.push(new PT.ErrorMessage(lnum, `Expected end of line at position '${parse.pos}'.`));
        }
        return;
    }

    // object creation: objname identifier [ number [ number [...] ]
    if (parse.match(RE_IDENTIFIER)) {
        const type = parse.matched;
        if (!Object.keys(SUPPORTED_OBJS).includes(type)) {
            result.errors.push(new PT.ErrorMessage(lnum, `Unknown object type '${type}'.`));
            return;
        }
        if (!parse.match(RE_WS)) {
            result.errors.push(new PT.ErrorMessage(lnum, `Expected whitespace at position '${parse.pos}'.`));
            return;
        }
        if (!parse.match(RE_IDENTIFIER)) {
            result.errors.push(new PT.ErrorMessage(lnum, `Missing object name.`));
            return;
        }
        const name = parse.matched;
        if (classifyIdentifier(result.data, name) != IdentifierType.UNUSED) {
            result.errors.push(new PT.ErrorMessage(lnum, `Duplicate identifier '${parse.matched}'.`));
            return;
        }
        const initList: number[] = [];
        while (!parse.match(RE_EOL)) {
            if (!parse.match(RE_WS)) {
                result.errors.push(new PT.ErrorMessage(lnum, `Expected whitespace at position '${parse.pos}'.`));
                return;
            }
            if (!parse.match(RE_NUMBER)) {
                result.errors.push(new PT.ErrorMessage(lnum, `Expected integer at position '${parse.pos}'.`))
                return;
            }
            initList.push(Number.parseInt(parse.matched));
        }
        result.data.objects.push(new PT.Obj(type, name, initList))
        return;
    }

    result.errors.push(new PT.ErrorMessage(lnum, `Unknown data entry.`));
}

class IndentTracker {
    indentStack: string[] = [];
    reasonStack: string[] = [];
    expectingIncrease: boolean = false;

    getCurrentPattern(): string[] {
        return this.indentStack;
    }

    getCurrentLevel(): number {
        return this.indentStack.length;
    }

    getFullString(): string {
        return this.indentStack.join("");
    }

    shouldIncrease(): boolean {
        return this.expectingIncrease;
    }

    expectIncrease(reason: string) {
        this.expectingIncrease = true;
        this.reasonStack.push(reason);
    }

    failedIncrease() {
        this.expectingIncrease = false;
        this.reasonStack.pop();
    }

    increase(s: string) {
        this.expectingIncrease = false;
        this.indentStack.push(s);
    }

    /**
     * Returns the reason the level just popped had been indented
     */
    decrease(): string {
        this.indentStack.pop();
        return this.reasonStack.pop() ?? "";
    }
}

/**
 * Parse a line that may contain a label, using the line number that would be jumped to if it is
 * Returns true if the line contained a label (i.e. skip for code parsing)
 */
function parseTextLabelLine(line: string, lnum: number, result: PT.ParseResult): boolean {
    const parse = new LineParse(line);
    parse.match(RE_WS_OPT);

    if (!parse.match(RE_IDENTIFIER)) {
        return false;
    }
    const identifier = parse.matched;
    const matchType = classifyIdentifier(result.data, identifier);

    // likely `labelname:`
    if (matchType === IdentifierType.UNUSED) {
        parse.match(RE_WS_OPT);
        if (!parse.match(RE_COLON)) {
            return false;
        }
        if (!parse.match(RE_EOL)) {
            result.errors.push(new PT.ErrorMessage(lnum, `Expected end of line at position '${parse.pos}'.`));
            return true; // technically did classify this as a label line
        }
        result.data.labels.push(new PT.Label(identifier, lnum));
        return true;
    } else if (matchType === IdentifierType.LABEL) {
        // did they try to redefine it?
        parse.match(RE_WS_OPT);
        if (parse.match(RE_COLON)) {
            // they did
            result.errors.push(new PT.ErrorMessage(lnum, `Duplicate label '${identifier}'.`));
            return true;
        }
    }
    return false;
}

function parseTextCodeLine(line: string, lnum: number, indent: IndentTracker, result: PT.ParseResult) {
    const parse = new LineParse(line);
    // if a parse encounters an error, it can simply throw an Error and cancel processing
    try {
        const indentInfo = parseTextLineIndent(parse, indent);
        const ast = parseTextLineAST(parse, indent, indentInfo.canElse, result);
        if (!parse.match(RE_EOL)) {
            throw new Error(`Expected end of line at position '${parse.pos}'.`); // you almost had it!
        }
        result.text[lnum] = new PT.Line(indentInfo.indentLevel, ast);
    } catch (e: unknown) {
        if (e instanceof Error) {
            result.errors.push(new PT.ErrorMessage(lnum, e.message));
        } else {
            result.errors.push(new PT.ErrorMessage(lnum, `INTERNAL ERROR: Unknown throwable.`));
        }
    }
}

interface IndentInformation {
    indentLevel: number;
    canElse: boolean;
}

function parseTextLineIndent(parse: LineParse, indent: IndentTracker): IndentInformation {
    parse.match(RE_WS_OPT);
    const indentString = parse.matched;
    let indentLevel = 0;
    let canElse = false;
    if (indent.shouldIncrease()) {
        // we expect an increase here, so it should match what we currently have and then add some
        const expectedString = indent.getFullString();
        if (!indentString.includes(expectedString)) {
            indent.failedIncrease();
            throw new Error(`Unexpected indentation pattern.`);
        }
        if (indentString.length <= expectedString.length) {
            indent.failedIncrease();
            throw new Error(`Expected indentation increase.`);
        }
        indent.increase(indentString.substring(expectedString.length));
        indentLevel = indent.getCurrentLevel();
    } else {
        // they should match the current level of indentation, though they may decrease the level
        const indentParse = new LineParse(indentString);
        const indentPattern = indent.getCurrentPattern();
        const indentMaxLevel = indent.getCurrentLevel();
        for (indentLevel = 0; indentLevel < indentMaxLevel; indentLevel++) {
            if (!indentParse.match(indentPattern[indentLevel])) {
                if (indentParse.match(RE_EOL)) {
                    break; // they're just decreasing
                }
                throw new Error(`Unexpected indentation pattern.`);
            }
        }
        // we should have reached EOL if we're matching the stack
        if (!indentParse.match(RE_EOL)) {
            throw new Error(`Unexpected indentation increase.`);
        }
        // if they decreased, we need to pop off the extra elements
        for (let i = indentLevel; i < indentMaxLevel; i++) {
            canElse = indent.decrease() === "if";
        }
    }
    return { indentLevel: indentLevel, canElse: canElse };
}

function parseTextLineAST(parse: LineParse, indent: IndentTracker, canElse: boolean, result: PT.ParseResult): PT.ASTNode {
    const startPos = parse.pos;

    // not an identifier - so we're just a solo equation
    if (!parse.match(RE_IDENTIFIER)) {
        return parseEquation(RE_EOL, parse, result);
    }

    const identifier = parse.matched;
    const matchType = classifyIdentifier(result.data, identifier);

    // saw a variable name, so this is likely to be an assignment
    if (matchType === IdentifierType.VAR) {
        const varslot = parseVarslot(identifier, parse, result);
        parse.match(RE_WS_OPT);
        if (!parse.match(RE_EQU)) {
            // wait - we're not an assignment, we're an equation!
            // but if they do try to assign, show them where the = should have gone
            // (this helps prevent confusion about doing x + 2 = input() instead of x[2] = input())
            const ogPosition = parse.pos;
            parse.pos = startPos;
            try {
                return parseEquation(RE_EOL, parse, result);
            } catch (e) {
                if (parse.line.indexOf("=") > 0) {
                    throw new Error(`Expected '=' following variable at position '${ogPosition}'`);
                } else {
                    throw e;
                }
            }
        } else {
            parse.match(RE_WS_OPT);
            const equation = parseEquation(RE_EOL, parse, result);
            return new PT.ASTAssignment(varslot, equation);
        }
    }

    // saw an object or function name, so expect an equation line
    else if (matchType === IdentifierType.OBJ || matchType === IdentifierType.FUNC) {
        // we need to undo the fact that we matched this, so the equation parser can get it
        parse.pos = startPos;
        return parseEquation(RE_EOL, parse, result);
    }

    // saw a keyword, so it's going to be one of the builtins like if, while, or jump
    else if (matchType === IdentifierType.KEYWORD) {
        if (identifier === "if") {
            parse.match(RE_WS_OPT);
            if (!parse.match(RE_PAREN_OPEN)) {
                throw new Error(`Expected '(' at position '${parse.pos}'.`);
            }
            const equation = parseEquation(RE_PAREN_CLOSE, parse, result);
            parse.match(RE_WS_OPT);
            if (!parse.match(RE_COLON)) {
                throw new Error(`Expected ':' at position '${parse.pos}'.`);
            }
            indent.expectIncrease("if");
            return new PT.ASTIf(equation);
        } else if (identifier === "else") {
            if (!canElse) {
                throw new Error(`'else' without 'if'.`);
            }
            parse.match(RE_WS_OPT);
            if (!parse.match(RE_COLON)) {
                throw new Error(`Expected ':' at position '${parse.pos}'.`);
            }
            indent.expectIncrease("else");
            return new PT.ASTElse();
        } else if (identifier === "while") {
            parse.match(RE_WS_OPT);
            if (!parse.match(RE_PAREN_OPEN)) {
                throw new Error(`Expected '(' at position '${parse.pos}'.`);
            }
            const equation = parseEquation(RE_PAREN_CLOSE, parse, result);
            parse.match(RE_WS_OPT);
            if (!parse.match(RE_COLON)) {
                throw new Error(`Expected ':' at position '${parse.pos}'.`);
            }
            indent.expectIncrease("while");
            return new PT.ASTWhile(equation);
        } else if (identifier === "jump") {
            if (!parse.match(RE_WS)) {
                throw new Error(`Expected whitespace at position '${parse.pos}'.`);
            }
            if (!parse.match(RE_IDENTIFIER)) {
                throw new Error(`Expected label name at position '${parse.pos}'.`);
            }
            if (classifyIdentifier(result.data, parse.matched) !== IdentifierType.LABEL) {
                throw new Error(`Identifier '${parse.matched}' is not a label.`);
            }
            return new PT.ASTJump(parse.matched);
        } else {
            throw new Error(`INTERNAL ERROR: Identifier '${identifier}' flagged as keyword but isn't one!`);
        }
    }

    // likely `labelname:` - but we preprocessed those, so this is illegal
    else if (matchType === IdentifierType.UNUSED) {
        throw new Error(`Unrecognized identifier '${identifier}' at position '${parse.pos - identifier.length}'.`);
    }

    // saw a label, but we don't expect that at the moment - would need `jump label` not just `label`
    else if (matchType === IdentifierType.LABEL) {
        throw new Error(`Unexpected label identifier '${identifier}'. Did you mean 'jump ${identifier}'?`);
    }

    // if this is reached, the parser is not covering every case above
    else {
        throw new Error(`INTERNAL ERROR: Unsupported identifier type.`);
    }
}

function parseVarslot(varname: string, parse: LineParse, result: PT.ParseResult): PT.ASTVarslot {
    parse.match(RE_WS_OPT);
    if (parse.match(RE_BRACKET_OPEN)) {
        const offset = parseEquation(RE_BRACKET_CLOSE, parse, result);
        return new PT.ASTVarslot(varname, offset);
    } else {
        return new PT.ASTVarslot(varname);
    }
}

function parseFunction(fname: string, parse: LineParse, result: PT.ParseResult): PT.ASTFunccall {
    parse.match(RE_WS_OPT);
    if (!parse.match(RE_PAREN_OPEN)) {
        throw new Error(`Expected '(' at position '${parse.pos}'.`);
    }
    const argCount = SUPPORTED_FUNCS[fname as keyof typeof SUPPORTED_FUNCS]; // dumb TS thing
    if (argCount === 0) {
        parse.match(RE_WS_OPT);
        if (!parse.match(RE_PAREN_CLOSE)) {
            throw new Error(`Expected ')' at position '${parse.pos}'.`);
        }
        return new PT.ASTFunccall(fname);
    } else if (argCount === 1) {
        const equation = parseEquation(RE_PAREN_CLOSE, parse, result);
        return new PT.ASTFunccall(fname, equation);
    } else {
        throw new Error(`INTERNAL ERROR: Unexpected argument count '${argCount}' for function '${fname}'.`);
    }
}

function parseObjFunction(objname: string, parse: LineParse, result: PT.ParseResult): PT.ASTObjFunccall {
    if (!parse.match(RE_PERIOD)) {
        throw new Error(`Expected '.' following '${objname}' at position '${parse.pos}'.`);
    }
    if (!parse.match(RE_IDENTIFIER)) {
        throw new Error(`Missing function name at position '${parse.pos}'.`)
    }
    const dataObj = result.data.objects.find((value) => value.name === objname)
    if (!dataObj) {
        throw new Error(`INTERNAL ERROR: ${objname} declared as object, but not in data segment.`);
    }
    const keyObj = SUPPORTED_OBJS[dataObj.type as keyof typeof SUPPORTED_OBJS]; // dumb TS thing
    if (!Object.keys(keyObj).includes(parse.matched)) {
        throw new Error(`Unrecognized function name '${parse.matched}' at position '${parse.pos}'.`);
    }
    const fname = parse.matched;
    parse.match(RE_WS_OPT);
    if (!parse.match(RE_PAREN_OPEN)) {
        throw new Error(`Expected '(' at position '${parse.pos}'.`);
    }
    const argCount = keyObj[fname as keyof typeof keyObj]; // dumb TS thing
    if (argCount === 0) {
        parse.match(RE_WS_OPT);
        if (!parse.match(RE_PAREN_CLOSE)) {
            throw new Error(`Expected ')' at position '${parse.pos}'.`);
        }
        return new PT.ASTObjFunccall(objname, fname);
    } else if (argCount === 1) {
        const equation = parseEquation(RE_PAREN_CLOSE, parse, result);
        return new PT.ASTObjFunccall(objname, fname, equation);
    } else {
        throw new Error(`INTERNAL ERROR: Unexpected argument count '${argCount}' for function '${objname}.${fname}'.`);
    }
}

function parseEquation(until: RegExp, parse: LineParse, result: PT.ParseResult): PT.ASTNode {
    const atoms = parseEquationAtomize(until, parse, result);
    return parseEquationCreateAST(atoms.args, atoms.operators);
}

interface AtomizedEquation {
    args: PT.ASTNode[];
    operators: string[];
}

function parseEquationAtomize(until: RegExp, parse: LineParse, result: PT.ParseResult): AtomizedEquation {
    const args: PT.ASTNode[] = [];
    const ops: string[] = [];

    while (true) {
        parse.match(RE_WS_OPT);

        // optional unary operator
        // if we see this, we'll create a sub equation just for that argument to include the unary op
        // we disallow - followed by a number, so -999 is -999 not -1 * 999 (though that means - -999 is valid...)
        const unary: string[] = [];
        while (parse.match(RE_UNARY_OPERATOR)) {
            unary.push(parse.matched);
            parse.match(RE_WS_OPT);
        }

        parse.match(RE_WS_OPT);

        // parse the argument
        let argument: PT.ASTNode | undefined = undefined;
        if (parse.match(RE_NUMBER)) {
            argument = new PT.ASTNumber(Number.parseInt(parse.matched));
            if (parse.match(RE_NUMBER)) {
                throw new Error(`Values must be in the range -999 to 999.`);
            }
        } else if (parse.match(RE_IDENTIFIER)) {
            const identifier = parse.matched;
            const matchType = classifyIdentifier(result.data, identifier);
            if (matchType === IdentifierType.VAR) {
                argument = parseVarslot(identifier, parse, result);
            }
            else if (matchType === IdentifierType.OBJ) {
                argument = parseObjFunction(identifier, parse, result);
            }
            else if (matchType === IdentifierType.FUNC) {
                argument = parseFunction(identifier, parse, result);
            } else {
                throw new Error(`Unexpected identifier '${identifier}' in equation at position '${parse.pos}'.`);
            }
        } else if (parse.match(RE_PAREN_OPEN)) {
            argument = parseEquation(RE_PAREN_CLOSE, parse, result);
        } else /* EOL or otherwise */ {
            throw new Error(`Expected equation argument at position '${parse.pos}'.`);
        }

        if (unary.length > 0) {
            // have some unaries, so split them into sub-equations
            let subNode = argument;
            do {
                subNode = new PT.ASTEquation(subNode, null, unary.pop()!);
            } while (unary.length > 0);
            args.push(subNode);
        } else {
            // just add the argument
            args.push(argument);
        }

        parse.match(RE_WS_OPT);

        // either we're done or we have an operator that indicates continuing
        if (parse.match(until)) {
            return { args: args, operators: ops };
        } else if (parse.match(RE_EOL)) {
            throw new Error(`Expected end of equation at position '${parse.pos}'.`);
        } else if (parse.match(RE_OPERATOR)) {
            ops.push(parse.matched);
        } else {
            throw new Error(`Expected equation operator at position '${parse.pos}'.`);
        }
    }
}

function parseEquationCreateAST(args: PT.ASTNode[], operators: string[]): PT.ASTNode {
    // base case: single argument
    if (args.length === 1) {
        return args[0];
    }

    // base case: only two arguments, just do that operation
    else if (args.length === 2) {
        return new PT.ASTEquation(args[0], args[1], operators[0]);
    }

    // recursive case: find the rightmost weakest-binding operator and split left and right based on that
    //                 (choose rightmost because we want the end result to evaluate within groups from left to right)
    else {
        for (let groupId = 0; groupId < OPERATOR_BINDING_GROUPS.length; groupId++) {
            for (let i = operators.length - 1; i >= 0; i--) {
                if (OPERATOR_BINDING_GROUPS[groupId].includes(operators[i])) {
                    return new PT.ASTEquation(
                        parseEquationCreateAST(args.slice(0, i + 1), operators.slice(0, i)),
                        parseEquationCreateAST(args.slice(i + 1), operators.slice(i + 1)),
                        operators[i]
                    );
                }
            }
        }
        // error! why didn't we match our operators?
        const opString = operators.join("'");
        throw new Error(`INTERNAL ERROR: Could not find binding groups for operator list '${opString}'.`)
    }
}
