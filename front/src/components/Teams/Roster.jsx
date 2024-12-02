import { useState, useEffect } from 'react';
import './Rosters.css';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const Roster = () => {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const teamId = urlParams.get('teamId');
    const teamName = location.state?.teamName || "Unnamed Team";

    const navigate = useNavigate();
    const [rosters, setRosters] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 5,
    });

    // Fetch roster data from the API
    const fetchRosters = async (page = 1) => {
        try {
            const tokens = JSON.parse(localStorage.getItem('tokens'));
            if (!tokens || !tokens.access) {
                console.error('Access token is missing');
                navigate('/login', { replace: true });
                return;
            }
            const accessToken = tokens.access;

            const response = await axios.get('http://127.0.0.1:5000/get_rosters', {
                headers: { Authorization: `${accessToken}` },
                params: {
                    page,
                    per_page: pagination.per_page,
                    team_id: teamId,
                },
            });

            const data = response.data;

            if (data.error === "Authorization token is missing") {
                navigate('/login', { replace: true });
                return;
            }

            if (Array.isArray(data.rosters)) {
                setRosters(data.rosters);
            } else {
                console.error('Expected rosters to be an array, but got:', data.rosters);
            }

            setPagination({
                total: data.total,
                pages: data.pages,
                current_page: data.current_page,
                per_page: data.per_page,
            });
        } catch (error) {
            console.error('Error fetching rosters:', error);
        }
    };

    useEffect(() => {
        fetchRosters();
    }, [teamId]);

    // Navigate to player details
    const handleViewPlayerDetails = (playerId) => {
        navigate(`/players/details?playerId=${playerId}`, {
            state: { teamName },
        });
    };

    // Pagination controls
    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.pages) {
            fetchRosters(page);
        }
    };

    return (
        <div className="roster-container">
            <h1 className="roster-title">Roster for {teamName}</h1>
            <div className="roster-background">
                {rosters.length > 0 ? (
                    rosters.map((player) => (
                        <div key={player.Player_ID} className="player-container">
                            <img
                                src="https://placehold.co/75x75"
                                alt={player.PlayerName}
                                className="player-img"
                            />
                            <div className="player-info">
                                <p className="player-name">{player.PlayerName}</p>
                                <p className="player-stat">Position: {player.Position}</p>
                                <p className="player-stat">Points: {player.Points}</p>
                                <p className="player-stat">Status: {player.Status}</p>
                            </div>
                            <button
                                className="view-player-details"
                                onClick={() => handleViewPlayerDetails(player.Player_ID)}
                            >
                                View Details
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="no-rosters">No players available in this roster</p>
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
        </div>
    );
};

export default Roster;
