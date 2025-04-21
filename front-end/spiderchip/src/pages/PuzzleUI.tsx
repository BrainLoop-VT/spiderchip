import { LevelItem, LineHighlight, LineHighlightType } from "../types.ts";
import PuzzleVisualization from "../components/PuzzleVisualization.tsx";
import PuzzleInput from "../components/PuzzleInput.tsx";
import PuzzleOutput from "../components/PuzzleOutput.tsx";
import PuzzleDetails from "../components/PuzzleDetails.tsx";
import "./PuzzleUI.css"
import { useEffect, useState, useRef } from "react";
import PuzzlePauseMenu from "../components/PuzzlePauseMenu.tsx";
import InputIcon from "../assets/images/input-icon.svg";
import DetailsIcon from "../assets/images/details-icon.svg";
import VizIcon from "../assets/images/visualization-icon.svg";
import OutputIcon from "../assets/images/output-icon.svg";
import MenuIcon from "../assets/images/pause-button-icon.svg";
import PlayIcon from "../assets/images/play-button-icon.svg";
import StepIcon from "../assets/images/step-button-icon.svg";
import HintIcon from "../assets/images/hint-button-icon.svg";
import ResetIcon from "../assets/images/reset-button-icon.svg";
import createRuntime from "../language-system/ls-system.ts";
import * as LT from "../language-system/ls-interface-types.ts";

const dummyPuzzle = new LT.Puzzle(3, [new LT.PuzzleTest([new LT.SpiderObject("stack", "mystack", [])], null, [5, 3], [8])], ["a", "b", "sum"]);

export default function PuzzleUI(props: { level: LevelItem }) {
    const runtime = useRef<LT.SpiderRuntime>(createRuntime(dummyPuzzle));
    const [rtState, setRtState] = useState<LT.SpiderState | null>(null);
    const [anims, setAnims] = useState<LT.SpiderAnimation[]>([]);
    const [caseNum, setCaseNum] = useState<number>(0);

    const [output, setOutput] = useState<string>("");
    const [highlightedLines, setHighlightedLines] = useState<LineHighlight[] | undefined>(undefined);

    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const [code, setCode] = useState<string>("");
    const [initialVars, setInitialVars] = useState<LT.CustomSlot[]>([]);

    useEffect(() => {
        const handleKeypress = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                toggleMenu();
            }
        }
        document.addEventListener("keydown", handleKeypress);
        return () => document.removeEventListener("keydown", handleKeypress);
    }, []);

    useEffect(() => {
        const fetchPuzzleData = async () => {
            try {
                // REAL BACKEND FETCH (uncomment when ready)
                /*
                const data = await res.json();
                const res = await axios.get(`/api/levels/${props.level.id}/testcase`);

                const puzzle = new Puzzle(
                  data.slotCount,
                  data.testCases.map(
                    (tc: any) =>
                      new PuzzleTest(
                        tc.objects.map(
                          (o: any) => new SpiderObject(o.type, o.name, o.contents)
                        ),
                        tc.slotValues,
                        tc.inputQueue,
                        tc.expectedOutput
                      )
                  ),
                  data.defaultSlotNames,
                  data.canEditSlots,
                  data.canRenameSlots
                );
                */
                const puzzle = dummyPuzzle; // NOTE: remove once real fetch is in (leave the dummy defined)

                // TODO: we need to pick out what the variables actually are - this is cooperation with the visualizer
                //       note that we'll need to setRtState after reiniting for that
                const vars = puzzle.defaultSlotNames?.map(
                    (name, i) => new LT.CustomSlot(i, name ?? undefined, 0)
                ) ?? [];
                setInitialVars(vars);

                const chosenCase = Math.floor(Math.random() * puzzle.testCases.length);
                setCaseNum(chosenCase);

                runtime.current = createRuntime(puzzle);
                runtime.current.init("", vars, chosenCase);
                setRtState(runtime.current.state());
                setAnims([]);
            } catch (err) {
                console.error("Failed to fetch puzzle data:", err);
            }
        };

        fetchPuzzleData();
    }, [props.level.id]);

    // TODO: Implement saving as player makes changes
    // TODO: Fix issue where "skipped" status on LevelSelect isn't saved when returning to page

    const toggleMenu = () => {
        setMenuIsOpen(prev => !prev);
    };

    /**
     * Update the linting, with a full update also highlighting illegal lines.
     * Setting force to true will always update, even if there are no linter errors.
     * Returns true if an update occurred.
     */
    const updateLinting = (full: boolean = false, force: boolean = false): boolean => {
        const lint = runtime.current.lint();
        if (lint.length > 0 || force) {
            setOutput(lint.map((err) => lintString(err)).join("\n"));
            if (full) {
                setHighlightedLines(runtime.current.lint().map((err) => { return { line: err.line, type: LineHighlightType.WARNING } }))
            }
            return true;
        }
        return false;
    }

    const editCode = (newCode: string) => {
        setCode(newCode);

        // parse whatever they just changed the code to
        runtime.current.init(newCode, initialVars, caseNum);
        const state = rtState ?? runtime.current.state();

        // check the PREVIOUS state - if it's already new, we shouldn't need to re-render
        // this prevents spamming visualizer updates while just writing code
        if (state.state !== LT.SpiderStateEnum.NEW && state.state !== LT.SpiderStateEnum.INVALID) {
            setRtState(runtime.current.state());
            setAnims([]);
        }

        // reset all highlights since they're editing code now
        setHighlightedLines(undefined);

        // keep the live linter output up to date (not error highlights, though)
        updateLinting(false, true);
    }

    const runCode = () => {
        try {
            // no need to spam state changes while doing this, so we can speed to end without rendering
            runtime.current.step();
            while (runtime.current.state().state === LT.SpiderStateEnum.RUNNING) {
                runtime.current.step();
            }
            // now render it
            updateCodeState();
        } catch (e) {
            console.log("Problem running:", e);
        }
    }

    const stepCode = () => {
        try {
            if (rtState?.state === LT.SpiderStateEnum.NEW || rtState?.state === LT.SpiderStateEnum.RUNNING) {
                // this function would have no effect, but we don't want to cause irrelevant visual re-updates
                runtime.current.step();
                updateCodeState();
            }
        } catch (e) {
            console.log("Problem stepping:", e);
        }
    }

    const updateCodeState = () => {
        if (updateLinting(true)) {
            // you have errors, show that instead
            return;
        }

        const newState = runtime.current.state();
        setRtState(newState);
        setAnims(runtime.current.anim());

        const codeOutputs = newState.output.join("\n");
        let additionalMessage = null;
        let highlightType = LineHighlightType.INFO;
        switch (newState.state) {
            case LT.SpiderStateEnum.FAIL:
                highlightType = LineHighlightType.WARNING;
                additionalMessage = "Test failed.";
                break;
            case LT.SpiderStateEnum.ERROR:
                highlightType = LineHighlightType.WARNING;
                additionalMessage = "Code crashed.";
                break;
            case LT.SpiderStateEnum.SUCCESS:
                highlightType = LineHighlightType.SUCCESS;
                additionalMessage = "Test passed!";
                break;
            case LT.SpiderStateEnum.DUBIOUS:
                highlightType = LineHighlightType.DEBUG;
                additionalMessage = "Test case passed, but another failed. Rerun your code.";
                setCaseNum(newState.failedCase ?? 0);
                break;
        }
        setHighlightedLines([{ line: newState.line, type: highlightType }]);
        setOutput([codeOutputs, newState.error, additionalMessage].filter((x) => x).join("\n"));
    }

    const resetCode = () => {
        runtime.current.init(code, initialVars, caseNum);
        setOutput("");
        setHighlightedLines(undefined);
        setRtState(runtime.current.state());
        setAnims([]);
        updateLinting();
    }

    const lintString = (err: LT.SpiderError): string => {
        return `Line ${err.line}: ${err.msg}`;
    }

    return (
        <div className="puzzle-layout">
            <div className="input-container">
                <div className="header">
                    <img src={InputIcon} alt="Input Icon" />
                </div>
                <PuzzleInput initialValue={code} onChange={editCode} lineHighlights={highlightedLines} />
                <div className="action-buttons">
                    <button className="menu-button" onClick={toggleMenu}>
                        <img src={MenuIcon} />
                        Menu
                    </button>
                    <button className="run-button" onClick={runCode}>
                        <img src={PlayIcon} />
                        Run
                    </button>
                    <button className="step-button" onClick={stepCode}>
                        <img src={StepIcon} />
                        Step
                    </button>
                    {/* TODO: show hints upon pressing this button */}
                    <button className="hint-button">
                        <img src={HintIcon} />
                        Hint
                    </button>
                    <button className="reset-button" onClick={resetCode}>
                        <img src={ResetIcon} />
                        Reset
                    </button>
                </div>
            </div>
            <div className="visualization-container">
                <div className="header">
                    <img src={VizIcon} />
                </div>
                {rtState && <PuzzleVisualization state={rtState} animations={anims} />}
            </div>
            <div className="output-container">
                <div className="header">
                    <img src={OutputIcon} />
                </div>
                <PuzzleOutput output={output} />
            </div>
            <div className="details-container">
                <div className="header">
                    <img src={DetailsIcon} />
                    <h2>{props.level.title}</h2>
                </div>
                <PuzzleDetails level={props.level} />
            </div>

            {menuIsOpen && <PuzzlePauseMenu setMenuIsOpen={setMenuIsOpen} />}
        </div>
    )
}
