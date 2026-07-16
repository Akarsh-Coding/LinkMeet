import React from 'react';
import { useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { IconButton, TextField, Button } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import '../styles/home.css';

function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState('');

    let handleJoinVideoCall = async () => {
        navigate(`/${meetingCode}`)
    }

    let handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/auth");
    }

    return (
        <div className="home-page">

            <header className="navBar">
                <div className="brand">
                    <img src="/logo3.png" alt="LinkMeet logo" className="brand-logo" />
                    <h2 className="brand-name">
                        <span className="brand-name-link">Link</span>
                        <span className="brand-name-meet">Meet</span>
                    </h2>
                </div>
                <div className="nav-actions">
                    <Button className="history-btn" startIcon={<RestoreIcon />}>
                        <span className="history-label">History</span>
                    </Button>
                    <Button className="logout-btn" variant="outlined" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            </header>

            <main className="meetContainer">
                <section className="leftPanel">
                    <span className="hero-eyebrow">
                        <span className="eyebrow-dot" aria-hidden="true"></span>
                        Connect. Meet. Together.
                    </span>

                    <h1 className="hero-title">Providing Quality Video Call Just Like Quality Education</h1>

                    <div className="join-row">
                        <TextField
                            onChange={e => setMeetingCode(e.target.value)}
                            id="outlined-Basic"
                            label="Meeting Code"
                            variant="outlined"
                            className="meeting-input"
                        />
                        <Button
                            onClick={handleJoinVideoCall}
                            variant="contained"
                            disabled={!meetingCode.trim()}
                            className="btn-primary"
                        >
                            Join
                        </Button>
                    </div>
                </section>

                <section className="rightPanel">
                    <div className="hero-visual">
                        <span className="hero-blob hero-blob--blue" aria-hidden="true"></span>
                        <span className="hero-blob hero-blob--indigo" aria-hidden="true"></span>
                        <img src="/logo3.png" alt="LinkMeet" className="hero-logo" />
                    </div>
                </section>
            </main>

        </div>
    );
};

export default withAuth(HomeComponent);