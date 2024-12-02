import { useState, useEffect } from 'react';
import './Teams.css'
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { user_id } from '../../recoil/AuthAtom';

const Teams = () => {
    const currentUser = useRecoilValue(user_id);
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const leagueId = urlParams.get('leagueId');
    const sport = urlParams.get('sport');
    const leagueName = location.state?.leagueName;
    const leagueType = location.state?.leagueType;

    const navigate = useNavigate();
    const [teams, setTeams] = useState([]); 
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5, 
    });

    const fetchTeams = async (page = 1) => {
        try {
        const tokens = JSON.parse(localStorage.getItem('tokens'));
        if (!tokens || !tokens.access) {
            console.error('Access token is missing');
            navigate('/login', { replace: true });
        }
        const accessToken = tokens.access;
        
        const response = await axios.get('http://127.0.0.1:5000/get_teams', {
            headers: {
                Authorization: `${accessToken}`,
            },
            params: {
            page,
            per_page: pagination.per_page,
            league_id: leagueId,
            },
        });
        const data = response.data;
        if (data.error === "Authorization token is missing") {
            navigate('/login', { replace: true });
        }
        if (Array.isArray(data.teams)) {
            setTeams(data.teams); 
        } else {
            console.error('Expected teams to be an array, but got:', data.teams);
        }

        setPagination({
            total: data.total,
            pages: data.pages,
            current_page: data.current_page,
            per_page: data.per_page,
        });
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [sport]); 

    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
        fetchTeams(page);
        }
    };

    const handleCreateTeams = () => {
        navigate(`/teams/create-team?leagueId=${leagueId}`, {
            state: { leagueName },
        });
    }

    const handleViewMatches = () => {
        navigate(`/matches/?leagueId=${leagueId}`, {
            state: { leagueName, leagueId },
        })
    }

    const handleViewDraft = async(leagueId, teamId, owner) => {
        if (currentUser !== owner){
            alert('You do not own this team.');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const sport = urlParams.get('sport');
        const team = urlParams.get('team');
        navigate(`/drafts?leagueId=${leagueId}&teamId=${teamId}&sport=${sport}&team=${team}`, {
            state: { team, sport },
        });
    };
    

    


  return (
    <div className="biggest">
        <h1 className='team-title'>Teams for {leagueName}</h1>
        <div className='team-upper'>
            {sport === "Sports" ?
                (<p></p>) 
                : (<button className='view-teams create-teams' onClick={handleViewMatches}>Matches</button>)
            }
            {sport === "Sports" ? (
                <p></p>
            ) : (
                <button
                    className='view-teams create-teams'
                    onClick={() => {
                        // if (leagueType === "R") {
                        //     const password = prompt("Enter the league password:");
                        //     if (password) {
                        //         handleCreateTeams();
                        //     } else {
                        //         alert("Password is required to create a team in this private league.");
                        //     }
                        // } else {
                        //     handleCreateTeams();
                        // }
                        if (leagueType === "R") {
                            alert("This league is private. It requires a permission from the commissioner")
                        } else {
                            handleCreateTeams();
                        }
                    }}
                >
                    Create
                </button>
            )}
        </div>
        <div className="teams-bground">
            {sport === "Sports" ? (<p className='team-name'>Please Select The Sports</p>) : teams.length > 0 ? (
            teams.map((team) => (
                <div key={team.Team_ID} className="team-container">
                    <img src="https://placehold.co/75x75" alt="Team" className='team-img'/>
                    <div className="team-info">
                        <p className="team-name">{team.TeamName}</p>
                        <p className="team-type">{team.TotalPoints}</p>
                        <p className="team-cap">{team.Ranking}</p>
                        <p className="team-date">
                        {team.Status}
                        </p>
                    </div>
                    <button className="view-teams" onClick={() => handleViewDraft(team.League_ID, team.Team_ID, team.Owner)}>Draft</button>
                </div>
            ))
            ) : (
            <p className='team-name'>No Teams available</p>
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

export default Teams;
