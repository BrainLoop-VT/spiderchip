import { useEffect } from "react";
import { SpiderState, SpiderAnimation } from "../language-system/ls-interface-types";
import { LevelItem } from "../types";
import "./PuzzleVisualization.css";

interface PuzzleVisualizationProps {
    state: SpiderState;
    animations: SpiderAnimation[];
    level?: LevelItem;
    currentTestCase?: number;
}

export default function PuzzleVisualization(props: PuzzleVisualizationProps) {
    const { state, level, currentTestCase = 0 } = props;
    
    if (!level?.inputData) {
        return (
            <div className="viz">
                <h2>Loading puzzle data...</h2>
            </div>
        );
    }

    const testCase = level.inputData.test_cases[currentTestCase];

    useEffect(() => {
        console.log("Current state:", state);
        console.log("Current animations:", props.animations);
    }, [state, props.animations]);

    return (
        <div className="viz">
            <h2>Puzzle {level.puzzleNumber}: {level.title}</h2>
            
            <div className="slots-container">
                <h3>Slots</h3>
                <div className="slots-grid">
                    {state.varslots.map((slot, i) => (
                        <div key={i} className="slot">
                            <span className="slot-name">{slot.name ?? `_${i}`}</span>
                            <span className="slot-value">{slot.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {state.objs.length > 0 && (
                <div className="objects-container">
                    <h3>Objects</h3>
                    {state.objs.map((obj, i) => (
                        <div key={i} className="object">
                            <span className="object-name">{obj.name}</span>
                            <span className="object-type">({obj.type})</span>
                            <span className="object-contents">[{obj.contents.join(", ")}]</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="io-container">
                <div className="input">
                    <h3>Input</h3>
                    <span>[{state.input.join(", ")}]</span>
                </div>
                {testCase?.target && (
                    <div className="target">
                        <h3>Target State</h3>
                        <span>[{testCase.target.join(", ")}]</span>
                    </div>
                )}
            </div>
        </div>
    );
}
