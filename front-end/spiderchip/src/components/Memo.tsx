import React from "react";
import "../components/Memo.css";
import paperCorner from "../assets/images/paper-corner.svg";

const Memo = ({children}: {children: React.ReactNode}) => {
    return (
        <div className="memo-container">
            <div className="content-overlay">
                {children}
            </div>
            <img className="memo-corner" src={paperCorner}/>
        </div>
    );
};

export default Memo;
