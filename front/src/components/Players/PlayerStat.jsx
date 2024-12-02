import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import './PlayerStat.css';

const PlayerStat = () => {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const playerName = location.state?.playerName;
    const playerId = urlParams.get('playerId');
    const sport = urlParams.get('sport'); // Get sport from query parameter

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Define the mapping of field names for different sports
    const fieldMapping = {
        football: {
            gameDate: 'GameDate',
            touchdowns: 'touchdowns',
            yards: 'yards',
            receptions: 'receptions',
            injuryStatus: 'InjuryStatus'
        },
        basketball: {
            gameDate: 'GameDate',
            points: 'points',
            assists: 'assists',
            rebounds: 'rebounds',
            injuryStatus: 'InjuryStatus'
        },
        // Add more sports and field mappings as needed
    };

    // Select the correct field names based on the sport
    const fields = fieldMapping[sport] || fieldMapping.football; // Default to football if sport is not found

    useEffect(() => {
        if (playerId) {
            axios
                .get(`/get_player_stat?player_id=${playerId}`)
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

    return (
        <div className="player-stat-container">
            <h1 className="player-stat-title">Player Statistics</h1>
            {playerName && <h2 className="player-stat-name">{playerName}</h2>}
            {!playerId && <p className="error-text">No Player ID Provided</p>}

            {loading && <p className="loading-text">Loading stats...</p>}
            {error && <p className="error-text">{error}</p>}

            {stats && stats.length > 0 ? (
                <table className="player-stat-table">
                    <thead>
                        <tr>
                            <th>{fields.gameDate}</th>
                            <th>{fields.touchdowns || fields.points}</th>
                            <th>{fields.yards || fields.rebounds}</th>
                            <th>{fields.receptions || fields.assists}</th>
                            <th>{fields.injuryStatus}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat) => {
                            const performance = typeof stat.PerformanceStat === 'string'
                                ? JSON.parse(stat.PerformanceStat)
                                : stat.PerformanceStat;

                            return (
                                <tr key={stat.Stat_ID}>
                                    <td>{stat[fields.gameDate]}</td>
                                    <td>{performance[fields.touchdowns] || performance[fields.points] || '-'}</td>
                                    <td>{performance[fields.yards] || performance[fields.rebounds] || '-'}</td>
                                    <td>{performance[fields.receptions] || performance[fields.assists] || '-'}</td>
                                    <td>{stat[fields.injuryStatus]}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                !loading && !error && <p className="no-stats-text">No stats found for this player.</p>
            )}
        </div>
    );
};

export default PlayerStat;
