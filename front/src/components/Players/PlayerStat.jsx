import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './PlayerStat.css';

const PlayerStat = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(location.search);
    const playerName = location.state?.playerName;
    const playerId = urlParams.get('playerId');
    const sports = urlParams.get('sport');

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fieldMapping = {
        football: {
            gameDate: 'GameDate',
            touchdowns: 'touchdowns',
            yards: 'yards',
            receptions: 'receptions',
            carries: 'carries',
            passes: 'passes',
            blocks: 'blocks',
            interceptions: 'interceptions',
            sacks: 'sacks',
            injuryStatus: 'InjuryStatus'
        },
        soccer: {
            gameDate: 'GameDate',
            points: 'points',
            assists: 'assists',
            passes: 'passes',
            injuryStatus: 'InjuryStatus'
        },
    };

    const fields = fieldMapping[sports]

    useEffect(() => {
        if (playerId) {
            const tokens = JSON.parse(localStorage.getItem('tokens'));
            if (!tokens || !tokens.access) {
                console.error('Access token is missing');
                navigate('/login', { replace: true });
                return;
            }
            const accessToken = tokens.access;
            axios.get(`http://127.0.0.1:5000/get_player_stat?player_id=${playerId}`, {
                headers: {
                    'Authorization': `${accessToken}`,
                    'Content-Type': 'application/json',
                }
            })
                .then((response) => {
                    setStats(response.data.stats);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err.response?.data?.error || 'Error fetching player stats');
                    setLoading(false);
                });
        } else {
            setError('Player ID is missing');
            setLoading(false);
        }
    }, [playerId]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    };

    return (
        <div className="player-stat-container">
            <h1 className="player-stat-title">Player Statistics</h1>

            <div className="pplayer-info">
                <img src="https://placehold.co/400x400" alt="Player" className="pplayer-image" />
                {playerName && <h2 className="pplayer-name">{playerName}</h2>}
            </div>

            {loading && <p className="loading-text">Loading stats...</p>}
            {error && <p className="error-text">{error}</p>}

            {stats && stats.length > 0 ? (
                <div className="player-stat-grid">
                    {stats.map((stat) => {
                        const performance = typeof stat.PerformanceStat === 'string'
                            ? JSON.parse(stat.PerformanceStat)
                            : stat.PerformanceStat;

                        return (
                            <div key={stat.Stat_ID} className="stat-card">
                                <div className="stat-item">
                                    <strong>{fields.gameDate}:</strong> {formatDate(stat[fields.gameDate])}
                                </div>

                                {fields.touchdowns && (
                                    <div className="stat-item">
                                        <strong>{fields.touchdowns}:</strong> {performance[fields.touchdowns] || '-'}
                                    </div>
                                )}

                                {fields.yards && (
                                    <div className="stat-item">
                                        <strong>{fields.yards}:</strong> {performance[fields.yards] || '-'}
                                    </div>
                                )}

                                {fields.receptions && (
                                    <div className="stat-item">
                                        <strong>{fields.receptions}:</strong> {performance[fields.receptions] || '-'}
                                    </div>
                                )}

                                {fields.carries && (
                                    <div className="stat-item">
                                        <strong>{fields.carries}:</strong> {performance[fields.carries] || '-'}
                                    </div>
                                )}

                                {fields.passes && (
                                    <div className="stat-item">
                                        <strong>{fields.passes}:</strong> {performance[fields.passes] || '-'}
                                    </div>
                                )}

                                {fields.blocks && (
                                    <div className="stat-item">
                                        <strong>{fields.blocks}:</strong> {performance[fields.blocks] || '-'}
                                    </div>
                                )}

                                {fields.interceptions && (
                                    <div className="stat-item">
                                        <strong>{fields.interceptions}:</strong> {performance[fields.interceptions] || '-'}
                                    </div>
                                )}

                                {fields.sacks && (
                                    <div className="stat-item">
                                        <strong>{fields.sacks}:</strong> {performance[fields.sacks] || '-'}
                                    </div>
                                )}

                                {fields.injuryStatus && (
                                    <div className="stat-item">
                                        <strong>{fields.injuryStatus}:</strong> {stat[fields.injuryStatus]}
                                    </div>
                                )}
                            </div>

                        );
                    })}
                </div>
            ) : (
                !loading && !error && <p className="no-stats-text">No stats found for this player.</p>
            )}
        </div>
    );
};

export default PlayerStat;
