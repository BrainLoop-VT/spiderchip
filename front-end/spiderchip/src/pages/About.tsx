import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Memo.css';
import Memo from '../components/Memo';

const About: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Memo>
            <h1>About SpiderChip</h1>
            <div className="about-content">
                <section>
                    <h2>What is SpiderChip?</h2>
                    <p>
                        SpiderChip is an educational game designed to teach programming
                        concepts through interactive puzzles. Players learn basic and advanced concepts of programming
                        while solving increasingly complex challenges.
                    </p>
                </section>

                <section>
                    <h2>How to Play</h2>
                    <p>
                        Each level presents you with a new programming challenge. You'll need to:
                    </p>
                    <ul>
                        <li>Write simple lines of code to solve the puzzle</li>
                        <li>Pass test cases to complete levels</li>
                        <li>Learn new commands to use as you progress</li>
                    </ul>
                </section>

                <section>
                    <h2>Gameplay Features</h2>
                    <ul>
                        <li>Interactive code editor</li>
                        <li>Real-time visualization</li>
                        <li>Progressive difficulty</li>
                        <li>Save your progress</li>
                    </ul>
                </section>
            </div>

            <div className="button-row">
                <button
                    className="primary-button"
                    onClick={() => navigate('/')}
                >
                    Back Home
                </button>
                <button
                    className="primary-button"
                    onClick={() => navigate('/about/language')}
                >
                    Programmer's Manual
                </button>
            </div>
        </Memo>
    );
};

export default About;
