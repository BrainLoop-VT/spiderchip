import {useNavigate} from "react-router-dom";
import './Game.css'

const Game = () => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate("/level-select");
    }

    const handleAboutClick = () => {
        navigate("/about");
    }

    return (
        <div className="game-home-container">
            <div className="game-home-content">
                <h1>Welcome to the Game!</h1>
                <div style={{display: 'flex', gap: '1em', justifyContent: 'center', paddingTop: '1em'}}>
                    <button className="primary-button" onClick={handleClick}>Go to Level Select</button>
                    <button className="primary-button" onClick={handleAboutClick}>About SpiderChip</button>
                </div>
            </div>
        </div>
    );
};

export default Game;
