import { useState, useEffect } from 'react';
import './Trades.css';
import axios from 'axios';
import { useRecoilValue } from 'recoil';
import { selectedSportAtom, changedSportSelector } from '../../recoil/Sport';
import { useNavigate, useLocation } from 'react-router-dom';
import { isLoginSelector } from '../../recoil/AuthAtom';
//import {team_id} from '../../recoil/AuthAtom';


const Trades = () => {
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

    return (
        <div className="biggest">
            <h1 className="drafts-title">Trade Players</h1>
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
                                className="add-to-team-button">
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

export default Trades;