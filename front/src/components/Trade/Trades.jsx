import { useState, useEffect } from 'react';
import './Trades.css';
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom } from '../../recoil/Sport';
import { useNavigate } from 'react-router-dom';

const Trades = () => {
    const navigate = useNavigate();
    const sport = useRecoilValue(selectedSportAtom);

    const [players, setPlayers] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5,
    });
    const [isLoading, setIsLoading] = useState(false); // To track loading state

    // Fetch players and teams from the API
    const fetchPlayersTeams = async (page = 1) => {
        setIsLoading(true);
        try {
            const tokens = JSON.parse(localStorage.getItem('tokens'));
            if (!tokens || !tokens.access) {
                console.error('Access token is missing');
                navigate('/login', { replace: true });
                return;
            }

            const accessToken = tokens.access;
            const response = await axios.get('http://127.0.0.1:5000/get_playersteams', {
                headers: {
                    Authorization: `${accessToken}`,
                },
                params: {
                    page,
                    per_page: pagination.per_page,
                },
            });

            const data = response.data;

            if (data.error === "Authorization token is missing") {
                navigate('/login', { replace: true });
                return;
            }

            // Debugging logs
            console.log("Fetched data:", data);

            // Ensure response is valid
            if (Array.isArray(data.playersteams)) {
                setPlayers(data.playersteams); // Replace current players
            } else {
                console.error('Invalid data format for players:', data.playersteams);
            }

            setPagination({
                total: data.total,
                pages: data.pages,
                current_page: page,
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
        fetchPlayersTeams(pagination.current_page);
    }, [sport]);

    // Handle pagination
    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
            fetchPlayersTeams(page);
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
                            <button className="add-to-team-button">
                                Request Trade for Player
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