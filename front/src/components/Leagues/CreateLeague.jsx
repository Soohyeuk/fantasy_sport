import React, { useState, useEffect} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CreateLeague.css';
import { useRecoilValue } from 'recoil';
import {changedSportSelector } from '../../recoil/Sport';
import {user_id} from '../../recoil/AuthAtom';
import axios from 'axios';
import { isLoginSelector } from '../../recoil/AuthAtom';

const CreateLeague = () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const sport = searchParams.get('sport');
    const navigate = useNavigate();

    const isLoggedIn = useRecoilValue(isLoginSelector);
    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login', { replace: true }); 
        }
    }, [isLoggedIn, navigate]);

    const userID = useRecoilValue(user_id);
    const [leagueName, setLeagueName] = useState('');
    const [leagueType, setLeagueType] = useState('');
    const [maxTeams, setMaxTeams] = useState('');
    const [draftDate, setDraftDate] = useState('');
    const initializedSports = useRecoilValue(changedSportSelector);
    const handleSubmit = (e) => {
        e.preventDefault();
        const { access: token } = JSON.parse(localStorage.getItem('tokens')) || {};
        const data = {
            leagueName,
            leagueType,
            userID,
            maxTeams,
            draftDate,
            initializedSports,
        };
        console.log(draftDate);
        axios.post('http://127.0.0.1:5000/post_leagues/', data, {
            headers: {
                Authorization: `Bearer ${token}`, 
            },
            withCredentials: true,
        })
        .then((response) => {
            console.log('League created successfully:', response.data);
            navigate(`/leagues?sport=${sport}`);
        })
        .catch((error) => {
            console.error('Error creating league:', error);
            if (error.response && error.response.data && error.response.data.message && 
                error.response.data.message.includes('Draft date must be at least one hour after the current UTC time')) {
                alert('The draft date must be at least one hour in the future. Please select a valid date.');
            }
        });
    };


    return (
        <div className="create-league-container">
            <h1>Create a League for {sport}</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="leagueName">League Name:</label>
                    <input
                        type="text"
                        id="leagueName"
                        value={leagueName}
                        onChange={(e) => setLeagueName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="leagueType">League Type:</label>
                    <select
                        id="leagueType"
                        value={leagueType}
                        onChange={(e) => setLeagueType(e.target.value)}
                        required
                    >
                        <option value="">Select Type</option>
                        <option value="P">Public</option>
                        <option value="R">Private</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="maxTeams">Max Teams:</label>
                    <input
                        type="number"
                        id="maxTeams"
                        value={maxTeams}
                        onChange={(e) => setMaxTeams(e.target.value)}
                        required
                        min="1"
                    />
                </div>
                <div>
                    <label htmlFor="draftDate">Draft Date:</label>
                    <input
                        type="datetime-local"
                        id="draftDate"
                        value={draftDate}
                        onChange={(e) => setDraftDate(e.target.value)}
                        required
                    />
                </div>
                <div className="form-actions">
                    <button type="submit">Create League</button>
                    <button type="button" onClick={() => navigate(`/leagues?sport=${sport}`)}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};
    
export default CreateLeague;
