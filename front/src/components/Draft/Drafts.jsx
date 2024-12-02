import { useState, useEffect } from 'react';
import './Drafts.css';
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom, changedSportSelector } from '../../recoil/Sport';
import { useNavigate, useLocation } from 'react-router-dom';

const Drafts = () => {
    const navigate = useNavigate();

    // Recoil state for selected sport
    const sport = useRecoilValue(selectedSportAtom);
    const initializedSports = useRecoilValue(changedSportSelector);

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

    // Add player to team
    const handleAddToTeam = (playerId, playerName) => {
        console.log(`Adding player ${playerName} (ID: ${playerId}) to the team.`);
        // You can integrate this with your backend API to add the player to the team.
        //setDraftedPlayers((prevDrafted) => new Set(prevDrafted).add(playerId));
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
                                    handleAddToTeam(player.Player_ID, player.FullName);
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