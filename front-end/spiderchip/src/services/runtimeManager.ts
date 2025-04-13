import {
    CustomSlot,
    Puzzle,
    SpiderRuntime,
    SpiderState,
    SpiderStateEnum,
    SpiderError,
  } from "../language-system/ls-interface-types";
  import createRuntime from "../language-system/ls-system";
  
  export const runtimeRef: { current: SpiderRuntime | null } = { current: null };
  
  export const initializeSpiderRuntime = (puzzle: Puzzle) => {
    runtimeRef.current = createRuntime(puzzle);
  };
  
  export const initializeRuntime = (
    code: string,
    setParserOutput: (output: string) => void,
    initialVars: CustomSlot[]
  ) => {
    if (!runtimeRef.current) {
      console.error("Runtime is not initialized.");
      return;
    }
  
    runtimeRef.current.init(code, initialVars, 0);
  
    const linterErrors = runtimeRef.current.lint();
    if (linterErrors.length > 0) {
      const errors = linterErrors
        .map((error: SpiderError) => `Line ${error.line}: ${error.msg}`)
        .join("\n");
      setParserOutput(errors);
      return;
    }
  
    const state = runtimeRef.current.state();
    if (state) updateOutput(state, setParserOutput);
  };
  
  export const stepCode = (
    setParserOutput: (output: string) => void,
    setExecutedLine: (line: number | undefined) => void
  ) => {
    if (!runtimeRef.current) return;
  
    runtimeRef.current.step();
    const state = runtimeRef.current.state();
    if (state) updateOutput(state, setParserOutput, setExecutedLine);
  };
  
  export const updateOutput = (
    state: SpiderState,
    setParserOutput: (output: string) => void,
    setExecutedLine?: (line: number | undefined) => void
  ) => {
    let outputMessage = "";
  
    switch (state.state) {
      case SpiderStateEnum.NEW:
        outputMessage = "Code parsed successfully. Ready to run.";
        break;
      case SpiderStateEnum.INVALID:
        outputMessage = "Code failed parsing. Check syntax.";
        break;
      case SpiderStateEnum.ERROR:
        outputMessage = `Runtime Error: ${state.error}`;
        break;
      case SpiderStateEnum.RUNNING:
        // outputMessage = `Running... Currently at line ${state.line}`;
        outputMessage = "";
        break;
      case SpiderStateEnum.SUCCESS:
        outputMessage = "Execution Successful!";
        break;
      case SpiderStateEnum.FAIL:
        outputMessage = "Execution Failed. Test case failed.";
        break;
      case SpiderStateEnum.DUBIOUS:
        outputMessage = `Execution passed this case but failed another (case ${state.failedCase}).`;
        break;
      default:
        outputMessage = "Unknown state.";
    }
  
    // state.varslots.forEach((slot, i) => {
    //   outputMessage += `\nTape Slot ${i}: ${slot.value} (${slot.name})`;
    // });
  
    // state.objs.forEach((obj) => {
    //   outputMessage += `\n${obj.type} '${obj.name}' Contents: ${obj.contents.join(", ")}`;
    // });

    if (state.output.length > 0) {
      state.output.forEach((val, _) => {
        outputMessage += `\n${val}`;
      });
    }
  
    setParserOutput(outputMessage.trim());

    if (setExecutedLine) {
      setExecutedLine(state.line);
    }
};
  