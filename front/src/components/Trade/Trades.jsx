import { useState, useEffect } from 'react';
import './Trades.css';
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom, changedSportSelector} from '../../recoil/Sport';
import { useNavigate } from 'react-router-dom';

const Trades = () => {
    const navigate = useNavigate();
    const sport = useRecoilValue(selectedSportAtom);
    const initializedSports = useRecoilValue(changedSportSelector);
    const urlParams = new URLSearchParams(window.location.search);
    const [tradedPlayers, setTradedPlayers] = useState(new Set()); // Tracks successfully traded players
    const teamId = urlParams.get('teamId');
    const [players, setPlayers] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5,
    });
    const [isLoading, setIsLoading] = useState(false); // To track loading state

    // Fetch players and teams from the API
    const fetchTradePlayers = async (page = 1) => {
        setIsLoading(true);
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
                    Authorization: `Bearer ${accessToken}`,
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
                return;
            }

            // Ensure response is valid
            if (Array.isArray(data.players)) {
                setPlayers(data.players); // Replace current players
            } else {
                console.error('Invalid data format for players:', data.players);
            }

            setPagination({
                total: data.total,
                pages: data.pages,
                current_page: data.current_page,
                per_page: data.per_page,
            });
        } catch (error) {
            console.error('Error fetching player teams:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch players when the component mounts or when the sport changes
    useEffect(() => {
        fetchTradePlayers();
    }, [sport]);

    // Handle pagination
    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
            fetchTradePlayers(page);
        }
    };

    const togglePlayerTrade = async (playerId, playerName, teamId) => {
        // Trade the player
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
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 201) {
                console.log('Player successfully added to the team:', response.data.message);
                setTradedPlayers((prev) => {
                    const updatedSet = new Set(prev);
                    updatedSet.add(playerId);
                    return updatedSet;
                }); // Add playerId to draftedPlayers
                alert(`Trade request for ${playerName} sent.`);
            } else {
                console.warn('Unexpected response:', response.data);
            }
        } catch (error) {
            console.error('Error adding player trade request: ${error.message}', error);
            alert(`Failed to trade player ${playerName}`);
        }
    };

    return (
        <div className="biggest">
            <h1 className="trade-title">Trade Players</h1>
            <div className="trade-bground">
                {isLoading ? (
                    <p>Loading players...</p>
                ) : players.length > 0 ? (
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
                            <button className="add-to-team-button"
                             onClick={() =>
                                togglePlayerTrade(player.Player_ID, player.FullName, teamId)
                            }>
                                {tradedPlayers.has(player.Player_ID) ? 'Request Sent' : 'Request Trade?'}
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
                    Page {pagination.current_page} of {pagination.pages}
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

export default Trades;