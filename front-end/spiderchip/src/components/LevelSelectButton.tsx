import {LevelItem} from "../types";
import "./LevelSelectButton.css"
import CompletedIcon from '../assets/images/completed-icon.svg';
import SkippedIcon from '../assets/images/skipped-icon.svg';
import defaultFolder from '../assets/images/folder-default.svg';
import hoverFolder from '../assets/images/folder-hover.svg';
import activeFolder from '../assets/images/folder-active.svg';
import {useState} from "react";

interface Props {
    level: LevelItem;
    isActive: boolean;
    setSelectedLevel: (level: LevelItem) => void;
    updateLevelStatus: (levelId: string, newStatus: LevelItem['status']) => void;
}

export default function LevelSelectButton(props: Props) {
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
        if (props.level.status !== "not-available") {
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    }

    const handleLevelOnClick = () => {
        props.setSelectedLevel(props.level)
    }

    const renderStatusIcon = () => {
        switch (props.level.status) {
            case "completed":
                return <img src={CompletedIcon}/>
            case "skipped":
                return <img src={SkippedIcon}/>
            default:
                return null;
        }
    }

    return (
        <li key={props.level.id}
            className="level-select-button"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/*<div className="folder-icon-wrapper">*/}
            <img
                src={defaultFolder}
                alt={"closed folder"}
                className={`icon ${props.isActive || isHovered ? "hidden" : ""}`}
            />
            <img
                src={hoverFolder}
                alt={"open folder on hover"}
                className={`icon ${isHovered && !props.isActive ? "" : "hidden"}`}
            />
            <img
                src={activeFolder}
                alt={"active folder"}
                className={`icon ${props.isActive ? "" : "hidden"}`}
            />
            {/*</div>*/}
            <button
                className="level-button"
                onClick={() => handleLevelOnClick()}
                disabled={props.level.status === "not-available"}
            >
                <h2>
                    {props.level.title.split(' ').map((word, index) => (
                        <div key={index}>{word}</div>
                    ))}
                </h2>
                <div className="status-icon">
                    {renderStatusIcon()}
                </div>
            </button>
        </li>
    )
}