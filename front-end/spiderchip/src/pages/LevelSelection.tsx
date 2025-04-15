import LevelSelectButton from "../components/LevelSelectButton.tsx"
import PuzzleDetailPopUp from "../components/PuzzleDetailPopUp.tsx";
import {LevelItem} from "../types.ts"
import GearIcon from "../assets/images/gear-icon.svg"
import "./LevelSelection.css"
import {useEffect, useRef, useState} from "react";
import { CSSTransition } from "react-transition-group";
import { setAuthToken } from "../services/api.ts";
import { useNavigate } from "react-router-dom";
import { api } from '../services/api';

export default function LevelSelection(props: { setSelectedLevel: (level: LevelItem | null) => void }) {
    const [selectedLevel, setLocalSelectedLevel] = useState<LevelItem | null>(null);
    const [popupContentLevel, setPopUpContentLevel] = useState<LevelItem | null>(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const navigate = useNavigate();
    const popupRef = useRef<HTMLDivElement>(null);
    const [levelList, setLevelList] = useState<LevelItem[]>([]);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                console.log('Auth header:', api.defaults.headers.common["Authorization"]);
                const response = await api.get('/levels');
                const sortedLevels = response.data.sort((a: LevelItem, b: LevelItem) => a.puzzleNumber - b.puzzleNumber);
                setLevelList(sortedLevels);
            } catch (error: any) {
                console.error('Failed to fetch levels:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    headers: error.response?.headers
                });
            }
        };

        fetchLevels();
    }, []);

    const toggleDropdown = () => {
        setDropdownVisible(!dropdownVisible)
    }

    const handleLevelSelect = (level: LevelItem) => {
        setPopUpContentLevel(level);
        setLocalSelectedLevel(level);
        props.setSelectedLevel(level);
    }

    const updateLevelStatus = (levelId: string, newStatus: LevelItem['status']) => {
        setLevelList(prevLevels =>
            prevLevels.map(level =>
                level.id === levelId ? {...level, status: newStatus} : level
            )
        );

        setLocalSelectedLevel(prevLevel =>
            prevLevel && prevLevel.id === levelId ? {...prevLevel, status: newStatus} : prevLevel
        );
    };

    const handleHome = () => {
        navigate("/game");
    }

    const handleLogOut = () => {
            setAuthToken(null);
            localStorage.removeItem("token");
            navigate("/");
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const popUp = document.querySelector(".puzzle-details-window");
            const dropdown = document.querySelector(".dropdown-menu")
            if (popUp && !popUp.contains(event.target as Node)) {
                setLocalSelectedLevel(null);
            }
            if (dropdown && !dropdown.contains(event.target as Node)) {
                setDropdownVisible(false);
            }
        };

        if (selectedLevel || dropdownVisible) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedLevel, dropdownVisible])

    return (
        <div className="level-selection-container">
            <div className="settings-dropdown">
                <button onClick={toggleDropdown}>
                    <img src={GearIcon}/>
                </button>
                {dropdownVisible && (
                    <ul className="dropdown-menu">
                        <li><button onClick={handleHome}>Home</button></li>
                        <li><button>Settings</button></li>
                        <li><button onClick={handleLogOut}>Log Out</button></li>
                    </ul>
                )}
            </div>
            <div className="scroll-container">
                <ul>
                    {levelList.map(level => (
                        <LevelSelectButton
                            key={level.id}
                            level={level}
                            isActive={selectedLevel?.id === level.id}
                            setSelectedLevel={handleLevelSelect}
                            updateLevelStatus={updateLevelStatus}
                        />
                    ))}
                </ul>
            </div>

            <CSSTransition
                in={!!selectedLevel}
                timeout={300}
                classNames="popup-slide"
                unmountOnExit
                nodeRef={popupRef}
                onExited={() => {
                    setPopUpContentLevel(null);
                    props.setSelectedLevel(null);
                }}
            >
                <div ref={popupRef} className={"popup-slide-wrapper"}>
                    {popupContentLevel && (
                    <PuzzleDetailPopUp
                        level={popupContentLevel}
                        setSelectedLevel={setLocalSelectedLevel}
                        updateLevelStatus={updateLevelStatus}
                    />
                        )}
                </div>
            </CSSTransition>
        </div>
    )
}