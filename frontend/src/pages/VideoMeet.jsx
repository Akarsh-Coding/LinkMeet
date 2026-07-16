import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import  "../styles/VideoMeet.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

// Gives each remote participant a stable color + short tag derived from their
// socket id, so multiple tiles read as distinct people rather than repeats
// of the same generic "Participant" label.
const getParticipantIdentity = (socketId) => {
    let hash = 0;
    for (let i = 0; i < socketId.length; i++) {
        hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return {
        color: `hsl(${hue}, 70%, 58%)`,
        tag: `Participant ${socketId.slice(0, 4).toUpperCase()}`
    };
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState([]);

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {
        console.log("HELLO")
        getPermissions();
    },[])

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        console.log("Stream:", userMediaStream);
                        console.log("Video Ref:", localVideoref.current);
                        localVideoref.current.srcObject = userMediaStream;
                        localVideoref.current.play();
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);
        }


    }, [video, audio])
    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();

    }




    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }





    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            getUserMedia()

        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }




    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            // Create a new video
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        setVideo(!video);
        // getUserMedia();
    }
    let handleAudio = () => {
        setAudio(!audio)
        // getUserMedia();
    }

    // Lobby-only controls: let the user mute/hide their camera before joining.
    // getMedia() (called by connect()) already reads videoAvailable/audioAvailable
    // to seed the in-call video/audio state, so flipping these here is enough —
    // no extra state or wiring needed once the call starts.
    let toggleLobbyVideo = () => {
        const nextState = !videoAvailable;
        setVideoAvailable(nextState);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(track => { track.enabled = nextState; });
        }
    }
    let toggleLobbyAudio = () => {
        const nextState = !audioAvailable;
        setAudioAvailable(nextState);
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => { track.enabled = nextState; });
        }
    }

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])
    let handleScreen = () => {
        setScreen(!screen);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/home"
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => {
        setModal(false);
    }
    let handleMessage = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }

    
    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }


    return (
        <div className="video-meet">

            {askForUsername === true ?

                <div className="lobby-screen">
                    <div className="lobby-card">

                        <div className="lobby-eyebrow">
                            <span className="tally-dot" aria-hidden="true"></span>
                            READY TO JOIN
                        </div>

                        <h2 className="lobby-title">Enter the lobby</h2>
                        <p className="lobby-subtitle">Check how you look and sound before you head in.</p>

                        <div className={`viewfinder ${videoAvailable ? '' : 'viewfinder--off'}`}>
                            <video ref={localVideoref} autoPlay muted className="lobby-video"></video>
                            <span className="corner corner-tl" aria-hidden="true"></span>
                            <span className="corner corner-tr" aria-hidden="true"></span>
                            <span className="corner corner-bl" aria-hidden="true"></span>
                            <span className="corner corner-br" aria-hidden="true"></span>

                            {!videoAvailable && (
                                <div className="viewfinder-fallback">
                                    <VideocamOffIcon />
                                    <span>Camera is off</span>
                                </div>
                            )}

                            <div className="viewfinder-controls">
                                <IconButton
                                    onClick={toggleLobbyAudio}
                                    className={`control-btn ${audioAvailable ? '' : 'control-btn--muted'}`}
                                    aria-label={audioAvailable ? 'Mute microphone' : 'Unmute microphone'}
                                >
                                    {audioAvailable ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                </IconButton>
                                <IconButton
                                    onClick={toggleLobbyVideo}
                                    className={`control-btn ${videoAvailable ? '' : 'control-btn--muted'}`}
                                    aria-label={videoAvailable ? 'Turn camera off' : 'Turn camera on'}
                                >
                                    {videoAvailable ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                                </IconButton>
                            </div>
                        </div>

                        <p className="lobby-hint">
                            Mic {audioAvailable ? 'on' : 'off'} · Camera {videoAvailable ? 'on' : 'off'} — you can change this anytime once you're in.
                        </p>

                        <div className="lobby-form">
                            <TextField
                                id="outlined-basic"
                                label="Your name"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                variant="outlined"
                                fullWidth
                                className="mv-input"
                            />
                            <Button
                                variant="contained"
                                onClick={connect}
                                disabled={!username.trim()}
                                fullWidth
                                className="btn-primary"
                            >
                                Join meeting
                            </Button>
                        </div>

                    </div>
                </div> :


                <div className="meetVideoContainer">

                    {showModal && (
                        <aside className="chatRoom">
                            <div className="chatContainer">

                                <div className="chat-header">
                                    <h1 className="chat-title">In-call messages</h1>
                                    <IconButton onClick={closeChat} className="chat-close" size="small" aria-label="Close chat">
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </div>

                                <div className="chattingDisplay">
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div className="chat-message" key={index}>
                                            <span className="chat-message-sender">{item.sender}</span>
                                            <p className="chat-message-bubble">{item.data}</p>
                                        </div>
                                    )) : (
                                        <p className="chat-empty">No messages yet — say hello.</p>
                                    )}
                                </div>

                                <div className="chattingArea">
                                    <TextField
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && message.trim()) sendMessage(); }}
                                        id="outlined-basic"
                                        label="Type a message"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        className="mv-input"
                                    />
                                    <Button
                                        variant='contained'
                                        onClick={sendMessage}
                                        disabled={!message.trim()}
                                        className="btn-send"
                                    >
                                        Send
                                    </Button>
                                </div>

                            </div>
                        </aside>
                    )}

                    <div className="stage">

                        <div className="stage-header">
                            <div className="stage-status">
                                <span className="tally-dot tally-dot--live" aria-hidden="true"></span>
                                LIVE
                            </div>
                            <span className="stage-participants">{videos.length + 1} in the room</span>
                        </div>

                        <div className="video-grid">

                            <div className="video-tile video-tile--self">
                                <video className="meetUserVideo" ref={localVideoref} autoPlay muted></video>
                                <span className="corner corner-tl" aria-hidden="true"></span>
                                <span className="corner corner-tr" aria-hidden="true"></span>
                                <span className="corner corner-bl" aria-hidden="true"></span>
                                <span className="corner corner-br" aria-hidden="true"></span>
                                <span className="video-tile-tag">
                                    You{!audio && ' · Muted'}
                                </span>
                            </div>

                            {videos.map((video) => {
                                const identity = getParticipantIdentity(video.socketId);
                                return (
                                    <div className="video-tile" key={video.socketId} style={{ '--tile-accent': identity.color }}>
                                        <video
                                            data-socket={video.socketId}
                                            ref={ref => {
                                                if (ref && video.stream) {
                                                    ref.srcObject = video.stream;
                                                }
                                            }}
                                            autoPlay
                                        >
                                        </video>
                                        <span className="corner corner-tl" aria-hidden="true"></span>
                                        <span className="corner corner-tr" aria-hidden="true"></span>
                                        <span className="corner corner-bl" aria-hidden="true"></span>
                                        <span className="corner corner-br" aria-hidden="true"></span>
                                        <span className="video-tile-tag">
                                            <span className="video-tile-dot" aria-hidden="true"></span>
                                            {identity.tag}
                                        </span>
                                    </div>
                                );
                            })}

                        </div>
                    </div>

                    <div className="buttonContainers">
                        <div className="control-dock">

                            <IconButton
                                onClick={handleAudio}
                                className={`control-btn ${audio ? '' : 'control-btn--muted'}`}
                                aria-label={audio ? 'Mute microphone' : 'Unmute microphone'}
                            >
                                {audio === true ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>

                            <IconButton
                                onClick={handleVideo}
                                className={`control-btn ${video ? '' : 'control-btn--muted'}`}
                                aria-label={video ? 'Turn camera off' : 'Turn camera on'}
                            >
                                {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>

                            {screenAvailable === true &&
                                <IconButton
                                    onClick={handleScreen}
                                    className={`control-btn ${screen ? 'control-btn--active' : ''}`}
                                    aria-label="Share your screen"
                                >
                                    {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                                </IconButton>
                            }

                            <Badge
                                badgeContent={newMessages}
                                max={99}
                                invisible={newMessages === 0}
                                className="chat-badge"
                            >
                                <IconButton
                                    onClick={() => (showModal ? closeChat() : openChat())}
                                    className={`control-btn ${showModal ? 'control-btn--active' : ''}`}
                                    aria-label="Toggle chat"
                                >
                                    <ChatIcon />
                                </IconButton>
                            </Badge>

                            <span className="control-divider" aria-hidden="true"></span>

                            <IconButton onClick={handleEndCall} className="control-btn control-btn--end" aria-label="Leave call">
                                <CallEndIcon />
                            </IconButton>

                        </div>
                    </div>

                </div>

            }

        </div>
    )
}