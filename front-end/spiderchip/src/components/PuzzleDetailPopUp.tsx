import {LevelItem} from "../types.ts";
import {useNavigate} from "react-router-dom";
import paperBkg from "../assets/images/paper-background.svg"
import "./PuzzleDetailPopUp.css"
import {useEffect, useState} from "react";

interface Props {
    level: LevelItem;
    setSelectedLevel: (level: LevelItem | null) => void;
    updateLevelStatus: (levelId: string, newStatus: LevelItem['status']) => void;
}

export default function PuzzleDetailsPopUp(props: Props) {
    if (!props.level) return null;

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
        props.setSelectedLevel(props.level);
        navigate("/puzzle-ui");
    }

    return (
        <div className="puzzle-details-window">
            <img src={paperBkg} alt={"background image for puzzle details"} />
            <div className="puzzle-details-content">
                <div className="puzzle-details">
                    <div>
                        <h1>{props.level.title}</h1>
                        <p>{props.level.preDescription}</p>
                    </div>
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