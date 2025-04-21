import { useEffect } from "react";
import { SpiderState, SpiderAnimation } from "../language-system/ls-interface-types"
import "./PuzzleVisualization.css"

export default function PuzzleVisualization(props: { state: SpiderState, animations: SpiderAnimation[] }) {
    useEffect(() => {
        // DEBUG: showing what our new animations to visualize are
        console.log(props.animations);
    }, [props.animations]);

    return (
        <div className="viz">
            <h1>Debug Visualization</h1>
            <h2>Slots</h2>
            {
                props.state.varslots.map((v, i) => {
                    return (<h3 key={i}>
                        {v.name ?? "_"} : {v.value}
                    </h3>)
                })
            }
            <h2>Objects</h2>
            {
                props.state.objs.map((o, i) => {
                    return (<h3 key={i}>
                        {o.name} ({o.type}) : [{o.contents.join(",")}]
                    </h3>)
                })
            }
            <h2>Remaining Input</h2>
            <h3>[{props.state.input.join(",")}]</h3>
        </div>
    )
}
