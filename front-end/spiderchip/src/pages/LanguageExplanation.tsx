import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Memo.css';
import ReactMarkdown from 'react-markdown';
import Memo from '../components/Memo';

const LanguageExplanation: React.FC = () => {
    const navigate = useNavigate();

    const markdown = `# Overview

The Spider programming language is designed to read and write simple integers and make use of basic objects.

Each program consists of three components:
1. Actual program code
2. Variable slots
3. Module objects

Execution of a Spider program begins at the first line in the code.
After the last line is executed, the program will automatically restart at the top.
Note that variables *do not reset* when the program jumps to the top.

Once a Spider program has completed its objective, it should halt either by trying to read more input or calling \`end()\`.

# Features

### Variable Slot

Variable slots are places to store integers from -999 to 999.

Slots can have names, which are shown next to the slot on the panel to the right.

When referencing a slot, simply use the variable name associated with it (e.g. \`x\`).
To reference slots relative to another slot, use \`x[N]\` where N is any equation (e.g. \`x[2]\` or \`x[y + 3]\`).

### Halting (Stopping)

Calling the \`end()\` function will halt (stop) a Spider program.
When this function is called, no more code will execute.

The Spider program will also halt under the following additional circumstances:
- \`input()\` is called when there are no more inputs.
- \`.next()\` is called on a command object which has no more commands.

The Spider program will *crash* under the following circumstances (avoid these cases!):
- Attempt to divide by zero.
- Attempt to reference a slot which does not exist.
- Attempt to pop from an empty stack.
- Attempt to dequeue from an empty queue.

### Input and Output

Basic input and output is available to every Spider module.

To read input, call the \`input()\` function.
The next available input is returned by this call.
If no inputs are available, the program will halt normally.

To send output, call the \`output(...)\` function, passing the output to send.
Only a single integer may be written at a time.

### Command Object

Certain modules are equipped with a command object, often called \`cmd\`.

The command object supports only one function: \`cmd.next()\`.
The \`cmd.next()\` function works similarly to \`input()\`; it returns the next available command.

### Stack Object

Certain modules are equipped with a stack object, often called \`s\`.

The stack object supports three functions:
- \`s.push(equation)\` Add the result of the given equation to the specified stack (in this case, \`s\`).
- \`s.pop()\` Return the value at the top of the specified stack (in this case, \`s\`).
- \`s.length()\` Return the number of items in the specified stack (in this case, \`s\`).

Examples:
\`s.push(3)\`
\`x = s.pop()\`
\`if (s.length() > 0):\`

### Queue Object

Certain modules are equipped with a queue object, often called \`q\`.

The queue object supports three functions:
- \`s.enqueue(equation)\` Add the result of the given equation to the specified queue (in this case, \`q\`).
- \`s.dequeue()\` Return the value at the front of the specified queue (in this case, \`q\`).
- \`s.length()\` Return the number of items in the specified queue (in this case, \`q\`).

Examples:
\`q.enqueue(3)\`
\`x = q.dequeue()\`
\`if (q.length() > 0):\`

# Code Statements

### Comments

Any text after a # character is a comment, and will not be executed as code.

For example, the following only executes as \`x = 2\`, as the \`+ 3\` is in a comment: \`x = 2 # + 3\`.

You can use comments to make notes in your code.

### Variable Assignment

Writes the result of the equation on the right side of the equals sign to the variable slot on the left.

Structure:
\`slot = equation\`

Examples:
\`x = 2\`
\`y = x * 3\`
\`z[2] = input() + 2\`

### Equations and Comparisons

Spider programs support basic math operations and comparisons on integers.

Each equation includes a sequence of operands (variable slots or function calls) with operators between them.
Parentheses around parts of the equation can be used to enforce order of operations, which would normally use PEMDAS.

The following list shows all supported math operators:
- \`+\` Add
- \`-\` Subtract right from left
- \`*\` Multiply
- \`/\` Divide left by right, discarding remainder (e.g., 7 / 3 = 2)
- \`%\` Divide left by right, saving only the remainder (e.g., 7 % 3 = 1)

The following list shows all supported comparison operators:
- \`>\` True if left side is greater than right side
- \`>=\` True if left side is greater than or equal to right side
- \`==\` True if left side is equal to right side
- \`!=\` True if left side is NOT equal to right side
- \`<=\` True if left side is less than or equal to right side
- \`<\` True if left side is less than right side

The following list shows all supported boolean operators:
- \`||\` ("or") True if either the left side or right side is true
- \`&&\` ("and") True if both the left side and right side is true

The following are some examples of equations:
\`2\`
\`x + 2\`
\`x * 6 / 3\`
\`2 + input() % 3\`
\`2 + cmd.next() - 1\`
\`(3 + 1) * 3\`
\`x < 5\`
\`x > 2 && y < 1\`

### Function Calls

Function calls are created by writing the name of the function followed by a pair of open and close parentheses.
Some functions take "arguments," which are written between the parentheses.

Function calls may be used in equations.

When a function "returns" a value, this can be thought of as dynamically replacing the function with the value returned.
For example, \`x = input()\` when \`input()\` returns 2 is equivalent to \`x = 2\`.

The following are examples of function calls:
\`end()\`
\`input()\`
\`output(y + 2)\`

### Object Function Calls

Object function calls are similar to regular function calls, but declare which object they should use at the beginning of the call.
The object's name is written, then a period, then the function name itself.

Object function calls, like regular functions, may be used in equations.

The following are examples of object function calls:
\`cmd.next()\`
\`s.push(10 / z)\`

### Conditional Statements

Conditional code is accomplished using if and else statements.

If statements use the following structure: \`if (equation):\`.
If the equation is true, then the if statement "passes" and its "block" is executed.

The block for an if statement is the indented lines of code immediately following this statement.
For example, in the following code, the block is the two lines that have extra spaces at the front:
\`\`\`
if (x == 2):
	output(x) # inside if statement
	x = 3     # inside if statement
output(x)     # OUTSIDE of if statement
\`\`\`

Else statements use the following structure: \`else:\`.
Else statements run if the previous if statement failed. It is illegal to place an else statement without a corresponding if.
For example, consider the following code:
\`\`\`
if (x == 2):
	output(x)
else:
	output(y)
\`\`\`

If x is 2, then the first block (\`output(x)\`) will run.
However, if x is not 2, then the second block (\`output(y)\` will run instead.

Blocks are allowed to contain other blocks inside them, for example:
\`\`\`
if (x == 3):
	if (y == 2):
		output(y)
	else:
		output(x)
\`\`\`

### While Loops

While loops are similar to if statements, but continue to execute their block as long as the statement is true.

For example, the following code will run once:
\`\`\`
x = 3
if (x > 0):
	output(x)
	x = x - 1
\`\`\`

The following code will run three times:
\`\`\`
x = 3
while (x > 0):
	output(x)
	x = x - 1
\`\`\`

# Advanced Features

These features are considered advanced functionality.
However, they may be useful under certain circumstances.

### Short Circuiting

When using the \`&&\` or \`||\` operators, the right side of the equation may not be evaluated.

For \`&&\`, the right side will not be evaluated if the left side is false (as the result is always false).  
For \`||\`, the right side will not be evaluated if the left side is true (as the result is always true).

This functionality is useful to prevent evaluating an equation that may have side effects, for example, \`x < 2 && output(x)\` only outputs s if x < 2 is true.

### Comparison as Value

Comparison operators, such as \`<\` or \`==\`, and boolean operators, \`||\` and \`&&\`, do not actually evaluate as "true" and "false."
Rather, they evaluate as the integers 0 and 1, where 0 is false and 1 is true.
In fact, any value that is not 0 is considered "truthy" and will be considered true in an equation.

For example, if x is 3, then \`if (x):\` will pass.

### Unary Operators

Spider programs support two operators in addition to the ones listed prior.
These operators are considered "unary" operators - they apply to only one part of the equation, rather than doing math on two values.

The \`-\` unary operator performs negation.
For example, if x is 3, then \`-x\` will be -3.

The \`!\` unary operator performs boolean "not."
For example, if \`(x > 3)\` is true, then \`!(x > 3)\` is false.
This can have useful effects when combined with the comparison-as-value feature.

### Undefined Return values

Certain functions do not return anything, such as \`output(...)\` or \`s.push(...)\`.
These functions actually always return the value 0.

### Unconditional Jumps

Spider programs support label statements and unconditional jumps.

First create a label by typing a name and then a colon: \`target:\`.
Next, use the jump operation by typing the word "jump" and then the label name: \`jump target\`.

Execution continues on the line immediately following the label.
The label may be anywhere in the program.

Example:
\`\`\`
x = 3
target:
output(x) # line executed after jumping
x = x - 1
if (x > 0):
	jump target
end()
\`\`\`

Remember that Spider programs automatically jump to the top after executing the last line, so a manual jump is not necessary.

`;

    return (
        <Memo>
            <h1>Programmer's Manual</h1>
            <div className="markdown-body">
                <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
            <button
                className="primary-button"
                onClick={() => navigate('/about')}
            >
                Back to About
            </button>
        </Memo>
    );
};

export default LanguageExplanation;
