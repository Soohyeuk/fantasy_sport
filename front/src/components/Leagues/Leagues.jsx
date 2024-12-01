import { useState, useEffect } from 'react';
import './Leagues.css'
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom, changedSportSelector } from '../../recoil/Sport';
import {isLoginSelector} from '../../recoil/AuthAtom';
import { useNavigate } from 'react-router-dom';

const Leagues = () => {
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState([]); 
    const sport = useRecoilValue(selectedSportAtom);
    const initializedSports = useRecoilValue(changedSportSelector);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5, 
    });

    const fetchLeagues = async (page = 1) => {
        try {
        const tokens = JSON.parse(localStorage.getItem('tokens'));
        if (!tokens || !tokens.access) {
            console.error('Access token is missing');
            navigate('/login', { replace: true });
            return;
        }
        const accessToken = tokens.access;
        
        const response = await axios.get('http://127.0.0.1:5000/get_leagues', {
            headers: {
                Authorization: `${accessToken}`,
            },
            params: {
            page,
            per_page: pagination.per_page,
            sport: initializedSports,
            },
        });
        const data = response.data;
        if (data.error === "Authorization token is missing") {
            navigate('/login', { replace: true });
        }
        if (Array.isArray(data.leagues)) {
            setLeagues(data.leagues); 
        } else {
            console.error('Expected leagues to be an array, but got:', data.leagues);
        }

        setPagination({
            total: data.total,
            pages: data.pages,
            current_page: data.current_page,
            per_page: data.per_page,
        });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    };

    useEffect(() => {
        fetchLeagues();
    }, [sport]); 

    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
        fetchLeagues(page);
        }
    };

    const handleCreateLeauges = () => {
        navigate(`/leagues/create-league?sport=${sport}`);
    }
    
    const handleViewTeams = (leagueId, leagueName, leagueType) => {
        const urlParams = new URLSearchParams(window.location.search);
        const sport = urlParams.get('sport');
        navigate(`/teams?leagueId=${leagueId}&sport=${sport}`, {
            state: { leagueName, leagueType }, 
        });
    };

  return (
    <div className="biggest">
        <h1 className='league-title'>Leagues for {sport}</h1>
        <div className='league-upper'>
            {sport === "Sports" ?
                (<p></p>) 
                : (<button className='view-teams create-teams' onClick={handleCreateLeauges}>Create</button>)
            }
        </div>
        <div className="leagues-bground">
            {sport === "Sports" ? (<p className='league-name'>Please Select The Sports</p>) : leagues.length > 0 ? (
            leagues.map((league) => (
                <div key={league.League_ID} className="league-container">
                <img src="https://placehold.co/75x75" alt="League" className='league-img'/>
                <div className="league-info">
                    <p className="league-name">{league.LeagueName}</p>
                    <p className="league-type">{league.LeagueType}</p>
                    <p className="league-cap">Max Teams: {league.MaxTeams}</p>
                    <p className="league-date">
                    {new Date(league.DraftDate).toLocaleDateString()}
                    </p>
                </div>
                <button className="view-teams" onClick={() => handleViewTeams(league.League_ID, league.LeagueName, league.LeagueType)}>View Teams</button>
                </div>
            ))
            ) : (
            <p className='league-name'>No leagues available</p>
            )}
        </div>

        <div className="pagination-controls">
            <button
            onClick={() => goToPage(pagination.current_page - 1)}
            disabled={pagination.current_page === 1}
            >
            Prev
            </button>
            <span>
            Page {pagination.pages === 0 ? 0 : pagination.current_page} of {pagination.pages}
            </span>
            <button
            onClick={() => goToPage(pagination.current_page + 1)}
            disabled={pagination.current_page === pagination.pages || pagination.pages === 0}
            >
            Next
            </button>
        </div>
    </div>);
};

export default Leagues;

