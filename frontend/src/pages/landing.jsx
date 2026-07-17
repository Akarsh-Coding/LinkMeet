import React from 'react';
import "../App.css"
import {Link, useNavigate} from "react-router-dom";


export default function LandingPage() {
    const router = useNavigate();
    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>Link Meet</h2>
                </div>
                <div className='navlist'>
                    <p onClick={()=>{
                        router("/guest@123")
                    }}> Join As Guest</p>
                    <p onClick={()=>{
                        router("/auth")
                    }}>Register</p>
                    <div role='button' onClick={()=>{
                        router("/auth")
                    }}><p>Login</p></div>
                </div>
            </nav>
            <div className="landingMainContainer">
                <div>
                    <h1><span style={{color:"#ff9839"}}>Connect</span> with your loved Ones</h1>
                    <p>Cover a distance by Link Meet</p>
                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>
                    <img src="/mobile.png" alt="" />
                </div>
            </div>
        </div>
    );
};