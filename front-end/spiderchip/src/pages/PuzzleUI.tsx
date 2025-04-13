import { LevelItem } from "../types.ts";
import PuzzleVisualization from "../components/PuzzleVisualization.tsx";
import PuzzleInput from "../components/PuzzleInput.tsx";
import PuzzleOutput from "../components/PuzzleOutput.tsx";
import PuzzleDetails from "../components/PuzzleDetails.tsx";
import "./PuzzleUI.css"
import { useEffect, useState } from "react";
import PuzzlePauseMenu from "../components/PuzzlePauseMenu.tsx";
import {
    initializeRuntime,
    initializeSpiderRuntime,
    stepCode
} from "../services/runtimeManager.ts";
import { 
    Puzzle,
    PuzzleTest,
    SpiderObject,
    CustomSlot,
} from "../language-system/ls-interface-types.ts";
import InputIcon from "../assets/images/input-icon.svg";
import DetailsIcon from "../assets/images/details-icon.svg";
import VizIcon from "../assets/images/visualization-icon.svg";
import OutputIcon from "../assets/images/output-icon.svg";
import PlayIcon from "../assets/images/play-button-icon.svg";
import StepIcon from "../assets/images/step-button-icon.svg";
import TestIcon from "../assets/images/test-button-icon.svg";
import HintIcon from "../assets/images/hint-button-icon.svg";
import ResetIcon from "../assets/images/reset-button-icon.svg";

export default function PuzzleUI(props: { level: LevelItem }) {
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const [code, setCode] = useState<string>("");4
    const [parserOutput, setParserOutput] = useState<string>("");
    const [initialVars, setInitialVars] = useState<CustomSlot[]>([]);
    const [executedLine, setExecutedLine] = useState<number | undefined>(1);

    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMenuIsOpen(prev => !prev);
            }
        };

        document.addEventListener("keydown", handleEscKey);
        return () => document.removeEventListener("keydown", handleEscKey);
    }, []);

    useEffect(() => {
        const fetchPuzzleData = async () => {
          try {
            // MOCK FETCH - using static JSON file for now
            const res = await fetch("/mockBackendAPI.json");
            const data = await res.json();
    
            // REAL BACKEND FETCH (uncomment when ready)
            // const res = await axios.get(`/api/levels/${props.level.id}/testcase`);
            // const data = res.data;
    
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
    
            const vars = puzzle.defaultSlotNames?.map(
              (name, i) => new CustomSlot(i, name ?? undefined, 0)
            ) ?? [];
    
            setInitialVars(vars);
            initializeSpiderRuntime(puzzle);
          } catch (err) {
            console.error("Failed to fetch puzzle data:", err);
          }
        };
    
        fetchPuzzleData();
      }, [props.level.id]);

    // TODO: Implement saving as player makes changes
    // TODO: Fix issue where "skipped" status on LevelSelect isn't saved when returning to page

    return (
        <div className="puzzle-layout">
            <div className="input-container">
                <div className="header">
                    <img src={InputIcon} alt="Input Icon" />
                </div>
                <PuzzleInput 
                  initialValue={code}
                  onChange={setCode}
                  executedLine={executedLine}
                />
                <div className="action-buttons">
                    <button className="run-button" onClick={() => initializeRuntime(code, setParserOutput, initialVars)}>
                        <img src={PlayIcon} />
                        Run
                    </button>
                    <button className="step-button" onClick={() => stepCode(setParserOutput, setExecutedLine)}>
                        <img src={StepIcon} />
                        Step
                    </button>
                    <button className="test-button">
                        <img src={TestIcon} />
                        Test
                    </button>
                    <button className="hint-button">
                        <img src={HintIcon} />
                        Hint
                    </button>
                    <button className="reset-button">
                        <img src={ResetIcon} />
                        Reset
                    </button>
                </div>
            </div>
            <div className="visualization-container">
                <div className="header">
                    <img src={VizIcon}/>
                </div>
                <PuzzleVisualization/>
            </div>
            {/*TODO: Implement buttons*/}
            <div className="output-container">
                <div className="header">
                    <img src={OutputIcon}/>
                </div>
                <PuzzleOutput output={parserOutput} />
            </div>
            <div className="details-container">
                <div className="header">
                    <img src={DetailsIcon}/>
                    <h2>{props.level.title}</h2>
                </div>
                <PuzzleDetails level={props.level}/>
            </div>

            {menuIsOpen && <PuzzlePauseMenu setMenuIsOpen={setMenuIsOpen} />}
        </div>
    )
}