import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CreateTeam.css';
import { useRecoilValue } from 'recoil';
import {changedSportSelector, selectedSportAtom } from '../../recoil/Sport';
import {user_id} from '../../recoil/AuthAtom';
import axios from 'axios';
import { isLoginSelector } from '../../recoil/AuthAtom';

const CreateTeam = () => {
    const location = useLocation();
    const leagueName = location.state?.leagueName;
    const searchParams = new URLSearchParams(location.search);
    const leagueId = searchParams.get('leagueId');
    const navigate = useNavigate();
    const sport = useRecoilValue(selectedSportAtom);

    const isLoggedIn = useRecoilValue(isLoginSelector);
    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login', { replace: true }); 
        }
    }, [isLoggedIn, navigate]);


    const owner = useRecoilValue(user_id);
    const [teamName, setTeamName] = useState('');
    const initializedSports = useRecoilValue(changedSportSelector);
    const handleSubmit = (e) => {
        e.preventDefault();
        const { access: token } = JSON.parse(localStorage.getItem('tokens')) || {};
        const data = {
            teamName,
            owner,
            leagueId,
        };
        axios.post('http://127.0.0.1:5000/post_teams/', data, {
            headers: {
                Authorization: `Bearer ${token}`, 
            },
            withCredentials: true,
        })
        .then((response) => {
            console.log('Team created successfully:', response.data);
            const urlParams = new URLSearchParams(window.location.search);
            const sport = urlParams.get('sport');
            navigate(`/teams?leagueId=${leagueId}&sport=${sport}`, {
                state: { leagueName }, 
            });
        })
        .catch((error) => {
            console.error('Error creating team:', error);
            // if (error.response && error.response.data && error.response.data.message && 
            //     error.response.data.message.includes('Draft date must be at least one hour after the current UTC time')) {
            //     alert('The draft date must be at least one hour in the future. Please select a valid date.');
            // }
        });
    };


    return (
        <div className="create-team-container">
            <h1>Create a Team for {leagueName}</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="teamName">Team Name:</label>
                    <input
                        type="text"
                        id="teamName"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                    />
                </div>
                <div className="form-actions">
                    <button type="submit">Create Team</button>
                    <button type="button" 
                        onClick={() => {const urlParams = new URLSearchParams(window.location.search);
                        const sport = urlParams.get('sport');
                        navigate(`/teams?leagueId=${leagueId}&sport=${sport}`, {
                            state: { leagueName }, 
                        });}}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};
    
export default CreateTeam;
