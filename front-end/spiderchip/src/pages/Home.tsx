import './Home.css';
import { useState } from "react";
import AuthModal from "../components/AuthModal";
import { useNavigate } from 'react-router-dom';
import Logo from "../assets/images/logo.svg";

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate()

  const handleStartClick = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/game");
    } else {
      setIsModalOpen(true);
    }
  };

    const handleAboutClick = () => {
        navigate("/about");
    }


  return (
    <div className="container">
      <img src={Logo} className="logo" alt="Spiderchip Logo"/>
      <p className="subtitle">an algorithms game</p>
      <button className="startButton" onClick={handleStartClick}>
        START
      </button>
      <button className="startButton" onClick={handleAboutClick}>
        ABOUT
       </button>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Home;
