import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import LevelSelection from "./pages/LevelSelection.tsx";
import PuzzleUI from "./pages/PuzzleUI.tsx";
import { LevelItem } from "./types.ts";
import { useState, useEffect } from "react";
import { setAuthToken } from './services/api.ts';

const isAuthenticated = () => {
    return !!localStorage.getItem("token");
};

const ProtectedRoute = ({children}: { children: JSX.Element }) => {
    return isAuthenticated() ? children : <Navigate to="/" replace/>;
};

// Public Route: Blocks access if the user IS authenticated
const PublicRoute = ({children}: { children: JSX.Element }) => {
    return isAuthenticated() ? <Navigate to="/" replace/> : children;
};

function App() {
    const [selectedLevel, setSelectedLevel] = useState<LevelItem | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setAuthToken(token);
        }
    }, []);

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path='/' element={<Home/>}/>
                <Route path='/game' element={<ProtectedRoute><Game/></ProtectedRoute>}/>
                <Route path='/level-select' element={<LevelSelection setSelectedLevel={setSelectedLevel}/>}/>
                <Route path='/puzzle-ui' element={selectedLevel ? <PuzzleUI level={selectedLevel}/> : <Navigate to="/level-select" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
