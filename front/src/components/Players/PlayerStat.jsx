import React from 'react'
import axios from "axios";
import { useLocation } from 'react-router-dom';
// import './Matches.css'; 


const PlayerStat = () => {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const playerName = location.state?.playerName;
    const playerId = urlParams.get('playerId');

    
    return (
        <div>
        </div>
    )
}

export default PlayerStat
