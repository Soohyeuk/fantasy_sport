import { useState, useEffect } from 'react';
import './Drafts.css';
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom, changedSportSelector } from '../../recoil/Sport';
import { useNavigate } from 'react-router-dom';

const Drafts = () => {
    const navigate = useNavigate();

    // Recoil state for selected sport
    const sport = useRecoilValue(selectedSportAtom);
    const initializedSports = useRecoilValue(changedSportSelector);
    const urlParams = new URLSearchParams(location.search);
    const leagueId = urlParams.get('leagueId');
    const teamId = urlParams.get('teamId');

    // State for draft player data and pagination
    const [players, setPlayers] = useState([]);
    const [draftedPlayers, setDraftedPlayers] = useState(new Set()); // Tracks successfully drafted players
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5,
    });

    // Fetch players from API
    const fetchDraftPlayers = async (page = 1) => {
        try {
            const tokens = JSON.parse(localStorage.getItem('tokens'));
            if (!tokens || !tokens.access) {
                console.error('Access token is missing');
                navigate('/login', { replace: true });
                return;
            }
            const accessToken = tokens.access;

            const response = await axios.get('http://127.0.0.1:5000/get_players', {
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
            if (Array.isArray(data.players)) {
                setPlayers(data.players);
            } else {
                console.error('Expected players to be an array, but got:', data.players);
            }

            setPagination({
                total: data.total,
                pages: data.pages,
                current_page: data.current_page,
                per_page: data.per_page,
            });
        } catch (error) {
            console.error('Error fetching draft players:', error);
        }
    };

    useEffect(() => {
        fetchDraftPlayers();
    }, [sport]);

    // Handle pagination
    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
            fetchDraftPlayers(page);
        }
    };

    // Add or remove player from team
    const togglePlayerDraft = async (playerId, playerName, teamId, leagueId) => {
        if (draftedPlayers.has(playerId)) {
            // Undraft the player
            try {
                const tokens = JSON.parse(localStorage.getItem('tokens'));
                if (!tokens || !tokens.access) {
                    console.error('Access token is missing');
                    navigate('/login', { replace: true });
                    return;
                }
                const accessToken = tokens.access;

                const payload = {
                    playerID: playerId,
                    teamID: teamId,
                    leagueID: leagueId,
                };

                const response = await axios.delete('http://127.0.0.1:5000/delete_playersteams/', {
                    headers: {
                        //Authorization: `${accessToken}`,
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    data: payload,
                });

                if (response.status === 200) {
                    console.log('Player successfully removed from the team:', response.data.message);
                    setDraftedPlayers((prev) => {
                        const updated = new Set(prev);
                        updated.delete(playerId);
                        return updated;
                    }); // Remove playerId from draftedPlayers
                    alert(`Player ${playerName} successfully removed from the team.`);
                } else {
                    console.warn('Unexpected response:', response.data);
                }
            } catch (error) {
                console.error('Error removing player from the team:', error);
                alert(`Failed to remove player ${playerName} from the team. Please try again.`);
            }
        } else {
            // Draft the player
            try {
                const tokens = JSON.parse(localStorage.getItem('tokens'));
                if (!tokens || !tokens.access) {
                    console.error('Access token is missing');
                    navigate('/login', { replace: true });
                    return;
                }
                const accessToken = tokens.access;

                const payload = {
                    playerID: playerId,
                    teamID: teamId,
                    leagueID: leagueId,
                };

                const response = await axios.post('http://127.0.0.1:5000/post_playersteams/', payload, {
                    headers: {
                        Authorization: `${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.status === 201) {
                    console.log('Player successfully added to the team:', response.data.message);
                    setDraftedPlayers((prev) => new Set(prev).add(playerId)); // Add playerId to draftedPlayers
                    alert(`Player ${playerName} successfully added to the team.`);
                } else {
                    console.warn('Unexpected response:', response.data);
                }
            } catch (error) {
                console.error('Error adding player to the team:', error);
                alert(`Failed to add player ${playerName} to the team. Please try again.`);
            }
        }
    };

    return (
        <div className="biggest">
            <h1 className="drafts-title">Draft Players</h1>
            <div className="drafts-bground">
                {players.length > 0 ? (
                    players.map((player) => (
                        <div key={player.Player_ID} className="player-container">
                            <img
                                src={player.Image || "https://placehold.co/75x75"}
                                alt="Player"
                                className="player-img"
                            />
                            <div className="player-info">
                                <p className="player-name">{player.FullName}</p>
                                <p className="player-position">Position: {player.Position}</p>
                                <p className="player-stat">Points: {player.FantasyPoints}</p>
                            </div>
                            <button
                                className="add-to-team-button"
                                onClick={() =>
                                    togglePlayerDraft(player.Player_ID, player.FullName, teamId, leagueId)
                                }
                            >
                                {draftedPlayers.has(player.Player_ID) ? 'Player Drafted' : 'Draft Player to Team'}
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="no-players">No players available</p>
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
                    disabled={
                        pagination.current_page === pagination.pages || pagination.pages === 0
                    }
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Drafts;



/*import { useState, useEffect } from 'react';
import './Drafts.css';
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom, changedSportSelector } from '../../recoil/Sport';
import { useNavigate, useLocation } from 'react-router-dom';
//import { team_id } from '../../recoil/AuthAtom';

const Drafts = () => {
    const navigate = useNavigate();

    // Recoil state for selected sport
    const sport = useRecoilValue(selectedSportAtom);
    const initializedSports = useRecoilValue(changedSportSelector);
    const urlParams = new URLSearchParams(location.search);
    const leagueId = urlParams.get('leagueId');
    const teamId = urlParams.get('teamId');

    // State for draft player data and pagination
    const [players, setPlayers] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5,
    });

    // Fetch players from API
    const fetchDraftPlayers = async (page = 1) => {
        try {
            const tokens = JSON.parse(localStorage.getItem('tokens'));
            if (!tokens || !tokens.access) {
                console.error('Access token is missing');
                navigate('/login', { replace: true });
                return;
            }
            const accessToken = tokens.access;

            const response = await axios.get('http://127.0.0.1:5000/get_players', {
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
            if (Array.isArray(data.players)) {
                setPlayers(data.players);
            } else {
                console.error('Expected players to be an array, but got:', data.players);
            }

            setPagination({
                total: data.total,
                pages: data.pages,
                current_page: data.current_page,
                per_page: data.per_page,
            });
        } catch (error) {
            console.error('Error fetching draft players:', error);
        }
    };

    useEffect(() => {
        fetchDraftPlayers();
    }, [sport]);
    

    // Handle pagination
    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
            fetchDraftPlayers(page);
        }
    };

    // Add player to team, creates a playersteams entry
    const handleAddToTeam = async (playerId, playerName, teamId, leagueId) => {
        console.log(`Adding player ${playerName} (ID: ${playerId}) to the team.`);
    
        try {
            const tokens = JSON.parse(localStorage.getItem('tokens'));
            if (!tokens || !tokens.access) {
                console.error('Access token is missing');
                navigate('/login', { replace: true });
                return;
            }
            const accessToken = tokens.access;
    
            // Prepare request payload
            const payload = {
                playerID: playerId,
                teamID: teamId,
                leagueID: leagueId,
            };
    
            // Make POST request to the backend
            const response = await axios.post('http://127.0.0.1:5000/post_playersteams/', payload, {
                headers: {
                    Authorization: `${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            // Handle success
            if (response.status === 201) {
                console.log('Player successfully added to the team:', response.data.message);
                alert(`Player ${playerName} successfully added to the team.`);
            } else {
                console.warn('Unexpected response:', response.data);
            }
        } catch (error) {
            // Handle errors
            console.error('Error adding player to the team:', error);
            alert(`Failed to add player ${playerName} to the team. Please try again.`);
        }
    };
    //const location = useLocation();
    //const teamName = new URLSearchParams(location.search).get('teamName');

    return (
        <div className="biggest">
            <h1 className="drafts-title">Draft Players</h1>
            <div className="drafts-bground">
                {players.length > 0 ? (
                    players.map((player) => (
                        <div key={player.Player_ID} className="player-container">
                            <img
                                src={player.Image || "https://placehold.co/75x75"}
                                alt="Player"
                                className="player-img"
                            />
                            <div className="player-info">
                                <p className="player-name">{player.FullName}</p>
                                <p className="player-position">Position: {player.Position}</p>
                                <p className="player-stat">Points: {player.FantasyPoints}</p>
                            </div>
                            <button
                                className="add-to-team-button"
                                onClick={(e) => {
                                    handleAddToTeam(player.Player_ID, player.FullName, teamId, leagueId);
                                    e.target.textContent = 'Player Drafted';
                                }}
                            >
                                Draft Player to Team
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="no-players">No players available</p>
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
                    disabled={
                        pagination.current_page === pagination.pages || pagination.pages === 0
                    }
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Drafts;
*/