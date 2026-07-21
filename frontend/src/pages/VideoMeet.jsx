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

// NOTE: this file now emits/listens for 3 new socket events -
// 'user-toggle-video', 'user-toggle-audio' and 'screen-share-status'.
// It assumes the server just relays these to everyone else in the room,
// the same way it already relays 'chat-message' (payload + sender's
// socket id). If the server doesn't have handlers for these yet, add
// them next to the existing chat-message relay.

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

    let [video, setVideo] = useState();

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // Who currently "has the floor" for screen sharing (a socketId), or
    // null if nobody is sharing. Synced to everyone via socket so only one
    // person can share at once.
    let [activeSharerId, setActiveSharerId] = useState(null);

    // The remote screen-share video itself (separate from that person's
    // camera stream, which still lives in `videos` above).
    let [remoteScreenShare, setRemoteScreenShare] = useState({ socketId: null, stream: null });

    // Camera/mic on-off state for everyone else, keyed by socketId, so we
    // can show a "camera is off" placeholder instead of a black tile.
    // { [socketId]: { video: bool, audio: bool } }
    let [remoteMeta, setRemoteMeta] = useState({});

    // Mirrors activeSharerId for use inside socket callbacks (which close
    // over whatever state existed when they were registered, not the
    // latest render) - same trick as the old screenRef used to do.
    const activeSharerRef = useRef(null);
    useEffect(() => { activeSharerRef.current = activeSharerId; }, [activeSharerId]);

    // <video> element that shows the big screen-share (ours or someone
    // else's) when activeSharerId is set.
    const screenVideoRef = useRef();

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {
        console.log("HELLO")
        getPermissions();
    },[])

    let getDislayMedia = () => {
        if (screen) {
            // Only one person gets the floor at a time - if someone else is
            // already sharing, don't even open the picker.
            if (activeSharerRef.current && activeSharerRef.current !== socketIdRef.current) {
                setScreen(false);
                return;
            }
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .catch((e) => {
                        console.log(e);
                        // Most likely the user closed the "choose what to share"
                        // picker — flip the button back off since nothing started.
                        setScreen(false);
                    })
            }
        } else {
            stopScreenShare();
        }
    }

    // Stops our screen-share tracks and tells the room the floor is free
    // again. Unlike before, this does NOT touch the camera stream at all -
    // the camera was never swapped out for the screen, so there's nothing
    // to "restore" here.
    let stopScreenShare = () => {
        try {
            window.localScreenStream && window.localScreenStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }
        window.localScreenStream = null;

        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
        }

        if (socketRef.current) socketRef.current.emit('screen-share-status', false);
        setActiveSharerId(prev => (prev === socketIdRef.current ? null : prev));
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

    // Camera/mic are their own independent stream now (window.localStream),
    // completely separate from window.localScreenStream - so toggling the
    // camera or mic works the same whether or not we're currently sharing
    // our screen. No more "deferred" special case needed here.
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
        // Grab a handle on the stream we're about to replace so we can take
        // it OUT of every peer connection before putting the new one in.
        // The old code never did this - it just added the new stream on
        // top of the old one - which is the real reason the camera would
        // sometimes get stuck / not come back after toggling it off and on.
        const oldCameraStream = window.localStream;

        window.localStream = stream
        localVideoref.current.srcObject = stream
        // explicit play() - just setting srcObject doesn't always resume
        // playback once the element has already rendered a previous stream
        localVideoref.current.play().catch(e => console.log(e))

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            try {
                if (oldCameraStream) connections[id].removeStream(oldCameraStream)
            } catch (e) { console.log(e) }

            connections[id].addStream(stream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        // safe to stop the old tracks now that every connection has already
        // been pointed at the new stream
        try { oldCameraStream && oldCameraStream.getTracks().forEach(track => track.stop()) } catch (e) { console.log(e) }

        stream.getTracks().forEach(track => track.onended = () => {
            // a track ended on its own (camera unplugged, OS-level stop,
            // etc.) - just flip our toggles off, the effect above will run
            // getUserMedia() again which now handles "both off" cleanly
            setVideo(false);
            setAudio(false);
        })
    }

    let getUserMedia = () => {
        // Use the current on/off toggles here, NOT videoAvailable/audioAvailable -
        // those get set once in the lobby (e.g. camera off before joining) and
        // never flip back, so gating on them here was blocking the camera from
        // actually turning back on mid-call (falling through to the black/silent
        // stream below even though the user just asked for it).
        if (video || audio) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e))
        } else {
            // Camera AND mic are both off - swap in a disabled black/silent
            // stream and push it through the same pipeline above (instead of
            // just stopping tracks locally like before) so remote peers
            // actually get told about it too, rather than being stuck
            // looking at our last frame forever.
            try {
                let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                getUserMediaSuccess(blackSilence())
            } catch (e) { console.log(e) }
        }
    }





    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        // Important: unlike the camera, we do NOT touch window.localStream
        // here. The screen share is a second, independent stream, so the
        // camera tile keeps playing (in the participant strip) the whole
        // time we're sharing, instead of getting replaced by the screen.
        window.localScreenStream = stream

        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream
            screenVideoRef.current.play().catch(e => console.log(e))
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(stream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        // Tell the room we've got the floor - everyone's UI (including
        // ours) switches to the big screen layout and the share button
        // gets disabled for everyone else until we stop.
        setActiveSharerId(socketIdRef.current)
        if (socketRef.current) socketRef.current.emit('screen-share-status', true)

        stream.getTracks().forEach(track => track.onended = () => {
            // The browser's own "Stop sharing" bar was used instead of our
            // button - just flip the toggle; the [screen] effect below
            // calls stopScreenShare() which does the actual cleanup.
            setScreen(false)
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

            // Remote camera/mic on-off, so we can show a placeholder
            // instead of a black tile for other people too.
            socketRef.current.on('user-toggle-video', (id, videoState) => {
                setRemoteMeta(prev => ({
                    ...prev,
                    [id]: { ...(prev[id] || { video: true, audio: true }), video: videoState }
                }))
            })
            socketRef.current.on('user-toggle-audio', (id, audioState) => {
                setRemoteMeta(prev => ({
                    ...prev,
                    [id]: { ...(prev[id] || { video: true, audio: true }), audio: audioState }
                }))
            })

            // Keeps everyone's "who is sharing" state in sync, and is also
            // what onaddstream below uses to tell a screen-share stream
            // apart from a plain camera stream.
            socketRef.current.on('screen-share-status', (id, sharing) => {
                setActiveSharerId(sharing ? id : null)
                if (!sharing) {
                    setRemoteScreenShare(prev => (prev.socketId === id ? { socketId: null, stream: null } : prev))
                }
            })

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
                setRemoteMeta(prev => {
                    const updated = { ...prev }
                    delete updated[id]
                    return updated
                })
                // if whoever left was mid-share, clear the big screen view too
                setActiveSharerId(prev => (prev === id ? null : prev))
                setRemoteScreenShare(prev => (prev.socketId === id ? { socketId: null, stream: null } : prev))
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

                    // Wait for their video stream. A peer can send us TWO
                    // streams now (camera, and optionally a screen share),
                    // so this has to figure out which one just arrived.
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        // We already have this person's camera tile, and the
                        // room says they're the current screen-sharer - so
                        // this fresh stream must be their screen, not a
                        // second camera. Route it to the screen-share state
                        // instead of the participant grid.
                        if (videoExists && activeSharerRef.current === socketListId) {
                            console.log("TREATING AS SCREEN SHARE STREAM");
                            setRemoteScreenShare({ socketId: socketListId, stream: event.stream });
                            return;
                        }

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

                    // If we're already sharing our screen when this new
                    // person joins, give them that stream too.
                    if (window.localScreenStream) {
                        connections[socketListId].addStream(window.localScreenStream)
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
        const nextVideo = !video;
        setVideo(nextVideo);
        // let everyone else know, so their tile for us can show the
        // "camera is off" placeholder instead of a black square
        if (socketRef.current) socketRef.current.emit('user-toggle-video', nextVideo);
    }
    let handleAudio = () => {
        const nextAudio = !audio;
        setAudio(nextAudio)
        if (socketRef.current) socketRef.current.emit('user-toggle-audio', nextAudio);
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
        if (!screen && activeSharerId && activeSharerId !== socketIdRef.current) {
            // someone else already has the floor - only one screen share at a time
            alert("Someone else is already sharing their screen. Wait for them to stop first.");
            return;
        }
        setScreen(!screen);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        try {
            window.localScreenStream && window.localScreenStream.getTracks().forEach(track => track.stop())
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

    // ---- small render helpers, used in both the plain grid and the
    // ---- smaller participant strip shown while someone is presenting ----

    // Our own camera tile. `strip` = true means render it small (the
    // screen-share layout), false means render it in the normal equal-size grid.
    const renderSelfTile = (strip) => (
        <div className={`video-tile video-tile--self ${strip ? 'video-tile--strip' : ''}`}>
            <video
                className="meetUserVideo"
                ref={localVideoref}
                autoPlay
                muted
                style={{ visibility: video ? 'visible' : 'hidden' }}
            ></video>

            {!video && (
                <div className="video-tile-fallback">
                    <VideocamOffIcon />
                    <span>Camera is off</span>
                </div>
            )}

            <span className="corner corner-tl" aria-hidden="true"></span>
            <span className="corner corner-tr" aria-hidden="true"></span>
            <span className="corner corner-bl" aria-hidden="true"></span>
            <span className="corner corner-br" aria-hidden="true"></span>
            <span className="video-tile-tag">
                {activeSharerId === socketIdRef.current ? 'You · Presenting' : `You${!audio ? ' · Muted' : ''}`}
            </span>
        </div>
    )

    // One remote participant's camera tile.
    const renderParticipantTile = (item, strip) => {
        const identity = getParticipantIdentity(item.socketId);
        const camOn = remoteMeta[item.socketId] ? remoteMeta[item.socketId].video : true;

        return (
            <div
                className={`video-tile ${strip ? 'video-tile--strip' : ''}`}
                key={item.socketId}
                style={{ '--tile-accent': identity.color }}
            >
                <video
                    data-socket={item.socketId}
                    style={{ visibility: camOn ? 'visible' : 'hidden' }}
                    ref={ref => {
                        if (ref && item.stream) {
                            ref.srcObject = item.stream;
                            ref.play().catch(e => console.log(e));
                        }
                    }}
                    autoPlay
                >
                </video>

                {!camOn && (
                    <div className="video-tile-fallback">
                        <VideocamOffIcon />
                        <span>Camera is off</span>
                    </div>
                )}

                <span className="corner corner-tl" aria-hidden="true"></span>
                <span className="corner corner-tr" aria-hidden="true"></span>
                <span className="corner corner-bl" aria-hidden="true"></span>
                <span className="corner corner-br" aria-hidden="true"></span>
                <span className="video-tile-tag">
                    <span className="video-tile-dot" aria-hidden="true"></span>
                    {identity.tag}{item.socketId === activeSharerId ? ' · Presenting' : ''}
                </span>
            </div>
        );
    }


    return (
        <div className="video-meet">

            {askForUsername === true ?

                <div className="lobby-screen">
                    <div className="lobby-card">

                        <div className="brand-logo">LinkMeet</div>

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
                                <span className="brand-logo brand-logo--small" aria-hidden="true">LinkMeet</span>
                                <span className="tally-dot tally-dot--live" aria-hidden="true"></span>
                                LIVE
                            </div>
                            <span className="stage-participants">{videos.length + 1} in the room</span>
                        </div>

                        {activeSharerId ? (
                            // --- Someone (maybe us) is sharing their screen ---
                            // big screen area on top, everyone's camera tiles
                            // in a small strip underneath, Meet/Teams style.
                            <div className="screen-share-layout">
                                <div className="screen-share-stage">
                                    <video
                                        ref={el => {
                                            screenVideoRef.current = el;
                                            if (!el) return;
                                            // figure out which stream belongs in the big
                                            // view: our own screen, or the sharer's
                                            const streamToShow = activeSharerId === socketIdRef.current
                                                ? window.localScreenStream
                                                : (remoteScreenShare.socketId === activeSharerId ? remoteScreenShare.stream : null);
                                            if (streamToShow && el.srcObject !== streamToShow) {
                                                el.srcObject = streamToShow;
                                                el.play().catch(e => console.log(e));
                                            }
                                        }}
                                        autoPlay
                                    ></video>
                                    <span className="corner corner-tl" aria-hidden="true"></span>
                                    <span className="corner corner-tr" aria-hidden="true"></span>
                                    <span className="corner corner-bl" aria-hidden="true"></span>
                                    <span className="corner corner-br" aria-hidden="true"></span>
                                    <span className="video-tile-tag">
                                        {activeSharerId === socketIdRef.current
                                            ? 'You are presenting'
                                            : `${getParticipantIdentity(activeSharerId).tag} is presenting`}
                                    </span>
                                </div>

                                <div className="participant-strip">
                                    {renderSelfTile(true)}
                                    {videos.map((item) => renderParticipantTile(item, true))}
                                </div>
                            </div>
                        ) : (
                            // --- Nobody sharing - plain equal-size grid ---
                            <div className="video-grid">
                                {renderSelfTile(false)}
                                {videos.map((item) => renderParticipantTile(item, false))}
                            </div>
                        )}
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
                                    disabled={!!activeSharerId && activeSharerId !== socketIdRef.current}
                                    className={`control-btn ${screen ? 'control-btn--active' : ''}`}
                                    aria-label={screen ? 'Stop sharing your screen' : (activeSharerId ? 'Someone else is presenting' : 'Share your screen')}
                                >
                                    {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
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