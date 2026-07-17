import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import HomeIcon from '@mui/icons-material/Home';
import VideocamIcon from '@mui/icons-material/Videocam';
import EventIcon from '@mui/icons-material/Event';
import HistoryIcon from '@mui/icons-material/History';
import ErrorIcon from '@mui/icons-material/Error';
import '../styles/history.css';

export default function History() {

    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch {
                // IMPLEMENT SNACKBAR
                setLoadError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [])

    let formatDate = (dateString) => {

        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();

        return `${day}/${month}/${year}`

    }

    return (
        <div className="history-page">

            <header className="history-topbar">
                <IconButton className="back-btn" onClick={() => routeTo("/home")} aria-label="Back to home">
                    <HomeIcon />
                </IconButton>
                <div className="history-heading">
                    <span className="history-eyebrow">
                        <HistoryIcon fontSize="inherit" />
                        YOUR MEETINGS
                    </span>
                    <h1 className="history-title">Meeting history</h1>
                </div>
            </header>

            <main className="history-content">

                {loading && (
                    <div className="history-skeleton-list">
                        {[0, 1, 2].map(i => (
                            <div className="history-skeleton-card" key={i}></div>
                        ))}
                    </div>
                )}

                {!loading && loadError && (
                    <div className="history-state">
                        <div className="history-state-icon history-state-icon--error">
                            <ErrorOutlineIcon fontSize="inherit" />
                        </div>
                        <p className="history-state-title">Couldn't load your history</p>
                        <p className="history-state-subtitle">Something went wrong on our end. Try refreshing the page.</p>
                    </div>
                )}

                {!loading && !loadError && meetings.length === 0 && (
                    <div className="history-state">
                        <div className="history-state-icon">
                            <VideocamIcon fontSize="inherit" />
                        </div>
                        <p className="history-state-title">No meetings yet</p>
                        <p className="history-state-subtitle">Meetings you join will show up here.</p>
                    </div>
                )}

                {!loading && !loadError && meetings.length !== 0 && (
                    <div className="history-list">
                        {meetings.map((e, i) => (
                            <Card key={i} variant="outlined" className="history-card">
                                <CardContent className="history-card-content">
                                    <div className="history-card-icon">
                                        <VideocamIcon fontSize="small" />
                                    </div>
                                    <div className="history-card-body">
                                        <Typography className="history-card-code">
                                            {e.meetingCode}
                                        </Typography>
                                        <Typography className="history-card-date">
                                            <EventIcon fontSize="inherit" />
                                            {formatDate(e.date)}
                                        </Typography>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

            </main>

        </div>
    )
}