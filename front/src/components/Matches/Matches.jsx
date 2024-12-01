import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from 'react-router-dom';
import './Matches.css'; 

const Matches = () => {
    const location = useLocation();
    const [matches, setMatches] = useState([]); 
    const [currentPage, setCurrentPage] = useState(1); 
    const [totalPages, setTotalPages] = useState(1); 
    const [loading, setLoading] = useState(true); 
    const leagueName = location.state?.leagueName;
    const leagueId = location.state?.leagueId;

    const fetchMatches = async (page = 1) => {
        try {
            setLoading(true);
            const tokens = JSON.parse(localStorage.getItem('tokens'));
            if (!tokens || !tokens.access) {
                console.error('Access token is missing');
                navigate('/login', { replace: true });
            }
            const accessToken = tokens.access;
            const response = await axios.get(`http://127.0.0.1:5000/league/${leagueId}/matches`, {
                headers: {
                    Authorization: `${accessToken}`,
                },
                params: {
                page: page,
                per_page: 10, 
                },
            });
            setMatches(response.data.matches);
            setTotalPages(response.data.pages);
            setCurrentPage(response.data.current_page);
        } catch (error) {
            console.error("Error fetching matches:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches(currentPage);
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
        }
    };

    return (
        <div className="matches-container">
        <h1>Matches for {leagueName}</h1>
        {loading ? (
            <p>Loading matches...</p>
        ) : matches.length > 0 ? (
            <table className="matches-table">
            <thead>
                <tr>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Final Score</th>
                <th>Match Date</th>
                <th>Winner</th>
                </tr>
            </thead>
            <tbody>
                {matches.map((match) => (
                <tr key={match.Match_ID}>
                    <td className="team-name">{match.Team1_Name}</td>
                    <td className="team-name">{match.Team2_Name}</td>
                    <td>{match.FinalScore}</td>
                    <td>{new Date(match.MatchDate).toLocaleDateString()}</td>
                    <td className="winner">
                    {match.Winner === match.Team1_ID ? match.Team1_Name : match.Team2_Name}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        ) : (
            <p>No matches found.</p>
        )}

        <div className="pagination">
            <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            >
            Previous
            </button>
            <span>
            Page {currentPage} of {totalPages}
            </span>
            <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            >
            Next
            </button>
        </div>
        </div>
    );
};

export default Matches;
