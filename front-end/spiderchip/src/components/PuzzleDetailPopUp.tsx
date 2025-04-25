import {LevelItem} from "../types.ts";
import {useNavigate} from "react-router-dom";
import paperBkg from "../assets/images/paper-background.svg"
import "./PuzzleDetailPopUp.css"
import {useEffect, useState} from "react";

export default function PuzzleDetailsPopUp(props: {
    level: LevelItem,
    updateLevelStatus: (levelId: number, newStatus: string) => void
}) {
    const navigate = useNavigate();
    const [isChecked, setIsChecked] = useState(props.level.status === "skipped")

    useEffect(() => {
        setIsChecked(props.level.status === "skipped");
    }, [props.level])

    const handleCheckboxChange = () => {
        if (!isChecked) {
            setIsChecked(true)
            props.updateLevelStatus(props.level.id, "skipped");
        }
    }

    const handleStartGame = () => {
        navigate(`/puzzle/${props.level.id}`);
    }

    return (
        <div className="puzzle-details-window">
            <img src={paperBkg} alt={"background image for puzzle details"} />
            <div className="puzzle-details-content">
                <div className="puzzle-details">
                    <div>
                        <h1>{props.level.title}</h1>
                        <h2>{props.level.category}</h2>
                    </div>
                    <p>Level Lore Goes Here. Lorem ipsum odor amet, consectetuer adipiscing elit. Sapien magnis integer
                        nascetur nullam porttitor quam fusce litora.</p>
                    <div>
                        <h3>Instructions</h3>
                        <p>{props.level.description}</p>
                    </div>
                </div>
                <div className="puzzle-details-buttons">
                    <button className="primary-button" onClick={handleStartGame}>Start</button>
                    <div className="skipped-checkbox">
                        {props.level.status === "completed" ? (
                            <span>Completed</span>
                        ) : (
                            <label>
                                <input
                                    type="checkbox"
                                    onChange={handleCheckboxChange}
                                    checked={isChecked}
                                    disabled={props.level.status === "completed" || props.level.status === "not-available" || props.level.status === "skipped"}
                                />
                                Skip
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
