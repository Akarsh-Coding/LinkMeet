import React from 'react';
import { Link } from "react-router-dom";
import '../styles/Landing.css';

export default function LandingPage() {
    return (
        <div className="landing-page">

            <nav className="landing-nav">
                <div className="nav-header">
                    <img src="/logo3.png" alt="LinkMeet logo" className="nav-logo" />
                    <h2 className="nav-brand">
                        <span className="nav-brand-link">Link</span>
                        <span className="nav-brand-meet">Meet</span>
                    </h2>
                </div>

                <div className="nav-list">
                    <Link to="/guest@123" className="nav-link">Join as Guest</Link>
                    <Link to="/auth" className="nav-link">Register</Link>
                    <Link to="/auth" className="nav-login-btn">Login</Link>
                </div>
            </nav>

            <main className="landing-hero">
                <div className="hero-copy">
                    <span className="hero-eyebrow">
                        <span className="eyebrow-dot" aria-hidden="true"></span>
                        Connect. Meet. Together.
                    </span>

                    <h1 className="hero-title">
                        <span className="hero-title-accent">Connect</span> with your loved ones
                    </h1>

                    <p className="hero-subtitle">Cover a distance by LinkMeet.</p>

                    <div className="hero-actions">
                        <Link to="/auth" className="btn-primary-link">Get Started</Link>
                        <Link to="/guest@123" className="btn-ghost-link">Join as Guest</Link>
                    </div>
                </div>

                <div className="hero-visual">
                    <span className="hero-blob hero-blob--blue" aria-hidden="true"></span>
                    <span className="hero-blob hero-blob--indigo" aria-hidden="true"></span>
                    <img src="/mobile.png" alt="LinkMeet video call preview on a phone" className="hero-mobile-image" />
                </div>
            </main>

        </div>
    );
};