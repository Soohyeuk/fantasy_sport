import { useState, useEffect } from 'react';
import './Waivers.css';
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom, changedSportSelector } from '../../recoil/Sport';
import { useNavigate } from 'react-router-dom';

const Waivers = () => {
    const navigate = useNavigate();

    // Recoil state for selected sport
    const sport = useRecoilValue(selectedSportAtom);
    const initializedSports = useRecoilValue(changedSportSelector);
    const urlParams = new URLSearchParams(location.search);
    const teamId = urlParams.get('teamId');

    // State for waiver player data and pagination
    const [players, setPlayers] = useState([]);
    const [waivedPlayers, setWaivedPlayers] = useState(new Set()); // Tracks successfully waived players
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5,
    });

    // Fetch players from API
    const fetchWaiverPlayers = async (page = 1) => {
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
            console.error('Error fetching waiver players:', error);
        }
    };

    useEffect(() => {
        fetchWaiverPlayers();
    }, [sport]);

    // Handle pagination
    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
            fetchWaiverPlayers(page);
        }
    };

    // Waive a player
    const handleWaivePlayer = async (playerId, playerName, teamId) => {
        if (waivedPlayers.has(playerId)) {
            alert(`Player ${playerName} has already been waived.`);
            return;
        }

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
            };

            const response = await axios.post('http://127.0.0.1:5000/post_playersteams/', payload, {
                headers: {
                    Authorization: `${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 201) {
                console.log('Player successfully waived:', response.data.message);
                setWaivedPlayers((prev) => new Set(prev).add(playerId)); // Add playerId to waivedPlayers
                alert(`Player ${playerName} successfully waived.`);
            } else {
                console.warn('Unexpected response:', response.data);
            }
        } catch (error) {
            console.error('Error waiving the player:', error);
            alert(`Failed to waive player ${playerName}. Please try again.`);
        }
    };

    return (
        <div className="waivers-container">
            <h1 className="waivers-title">Waive Players</h1>
            <div className="waivers-bground">
                {players.length > 0 ? (
                    players.map((player) => (
                        <div key={player.Player_ID} className="waiver-container">
                            <img
                                src={player.Image || "https://placehold.co/75x75"}
                                alt="Player"
                                className="waiver-img"
                            />
                            <div className="waiver-info">
                                <p className="waiver-name">{player.FullName}</p>
                                <p className="waiver-position">Position: {player.Position}</p>
                                <p className="waiver-stat">Points: {player.FantasyPoints}</p>
                            </div>
                            <button
                                className="waiver-action-button"
                                onClick={() =>
                                    handleWaivePlayer(player.Player_ID, player.FullName, teamId)
                                }
                                disabled={waivedPlayers.has(player.Player_ID)}
                            >
                                {waivedPlayers.has(player.Player_ID) ? 'Player Waived' : 'Waive Player'}
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="no-waivers">No players available</p>
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

export default Waivers;
