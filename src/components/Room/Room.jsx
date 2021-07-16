import React,{useEffect,useState,useRef,useCallback} from 'react';
import "./Room.scss";
import {io} from "socket.io-client";
import {makeStyles} from "@material-ui/core/styles";
import "./Room.scss";
import {
    Paper,
    InputBase,
    List,
    ListSubheader,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Typography,
    ListItemSecondaryAction,
    IconButton,
    Button
    
} from "@material-ui/core";
import {
    CallEndRounded as HangupIcon,
    MicRounded as MicrophoneIcon,
    SendRounded as MessageIcon,
    DesktopMacRounded as DesktopIcon,
    DesktopAccessDisabled as DesktopDesableIcon,
    MicOffRounded as MicrophoneDisableIcon
} from "@material-ui/icons";
const SOCKET_ENDPOINT="http://localhost:5001";




const captureWebcam=()=> {
    return new Promise((resolve,reject) => {
        navigator.mediaDevices.getUserMedia({video:true,audio:true})
        .then(currentStream=>{
            resolve(currentStream);
        })
        .catch(() =>{
            reject();
        })
    });
}

class VidStream{
    constructor(stream,target){
        this.stream=stream;
        this.target=target;
    }
}

const toggleStreamTrack=(stream,type,enabled)=>{
    /* 
    toggle video or audio of stream ; also remote peers tracks will disable  
    usage: toggleStreamTrack(localStream,'video',true); 
    */
    if(stream){ //if stream was not null or undefined
        stream.getTracks().forEach((track)=>{
            if(track.kind===type){
                track.enabled=enabled
            }
        })
    }
}

// const stopCapture=(vidElem)=>{
//     let tracks = vidElem.srcObject.getTracks();
//     tracks.forEach(track => track.stop());
//     vidElem.srcObject = null;
// }
const captureScreen=()=>{
    return new Promise((resolve, reject) =>{
        /*
        {
            video:{
                width:1920,
                height:1080,
                frameRate: { ideal: 15, max: 20 }}
        }
        */
        navigator.mediaDevices.getDisplayMedia({video:true})
        .then(currentStream=>{
            resolve(currentStream);
        })
        .catch(() =>{
            reject();
        })

    }) 
        
}
// const captureMic=()=> {
//     return new Promise((resolve,reject) => {
//         navigator.mediaDevices.getUserMedia({audio:true})
//         .then(currentStream=>{
//             resolve(currentStream);
//         })
//         .catch(() =>{
//             reject();
//         })
//     });
// }

const randID=Math.floor(Math.random()*1000); //generate random ID for user
const useStyle = makeStyles(theme=>{
    return {
        nav:{
            position:"fixed",
            width:"100%",
            bottom:"0",
            background:"#111",
            height:"65px",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            
            "& button":{
                color:"#fff",
                margin:"0 10px",
                background:"#333",

            },
            "& .bgRed":{
                background:"#f00",
                "&:hover":{
                    filter:"brightness(.8)"
                }
            },
        },
        chatbox:{
            display:"none",
            position:"fixed",
            width:"420px",
            height:"calc(100vh - 65px)",
            right:"0",
            top:"0",
            
            "& .form":{
                position:"absolute",
                bottom:"0",
                width:"100%",
                display:"flex",
                borderTop:"1px solid rgba(0,0,0,.2)"
            },
            "& .input":{
                flexGrow:"1",
                padding:`5px ${theme.spacing(1)}px`,
            },
            // "& .status":{
            //     color:theme.palette.text.secondary
            // },
        },

    }
})

export default function Room(props) {
    const [message,setMessage] = useState("");
    const [desktopIsSharing,setDesktopIsSharing]=useState(false);
    const [micIsSharing,setMicIsSharing]=useState(true);
    const [chats,setChats] = useState([]);
    const messageFormRef=useRef(null);
    const shareDesktopRef=useRef(null);
    // const hangupBtnRef=useRef(null);
    
    const classes=useStyle();
    




    


    
    const handleChange=(e)=>{
        setMessage(e.target.value);
    }


    const [username,setUsername] = useState("");
    const [room,setRoom] = useState("room1");
    const [streams,setStreams]= useState([]);
    const socketRef=useRef(null);
    const desktopButtonRef=useRef(null);
    const shareBtnRef=useRef(null);
    const [selfStream,setSelfStream] = useState(null);
    // const streamSetted = useRef(null);
    const connectionsRef=useRef({});
    
    
    const handleNegotiationNeeded=async(pc)=> {
        console.log('handle negotiation needed fired');
        const offer=await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('offer',{
            offer:pc.localDescription,
            target:pc.target
        });
    }
    const addStreams=useCallback((e,target)=>{
        const newStream= new VidStream(e.streams[0],target);
        setStreams((last)=>{
            const newVal=last.filter(val=>val.stream.id !==newStream.stream.id);
            return [...newVal,newStream];
        });
    },[]);
    const handleICECandidateEvent=useCallback((e,pc)=>{
        if(e.candidate){
            socketRef.current.emit("ice-candidate", {
                target:pc.target,
                candidate:e.candidate
            });
        }
        else{
            console.log(`peer ${pc.target} connected`);
        }        
    },[]);

    const createPeer=(target)=>{
        const peer=new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
            ]
        });
        peer.onicecandidate = (e)=>{handleICECandidateEvent(e,peer)};
        peer.ontrack = (e)=>{addStreams(e,target)};
        peer.onnegotiationneeded = () =>{handleNegotiationNeeded(peer)};
        peer.target=target;
    
        return peer;
    };


    
    useEffect(()=>{
        socketRef.current=io(SOCKET_ENDPOINT);
        socketRef.current.on('connect',()=>{
            console.log('socket connection established');
        })
        
        return()=>{
            socketRef.current.close();
        }
    },[]);

    useEffect(()=>{
        messageFormRef.current.onsubmit=(e)=>{
            e.preventDefault();
            if(message.trim()===""){//if it was empty message 
                return;
            }
            setMessage("");
            socketRef.current.emit('chat', {
                message: message.trim(),
                handle: `user${randID}`
            });
        };

        shareBtnRef.current.onclick=async()=>{
            const tempStream = await captureWebcam();
            setSelfStream(tempStream);

            for(const key in connectionsRef.current){
                tempStream.getTracks().forEach((track)=>{
                    connectionsRef.current[key].addTrack(track,tempStream);
                });
            }

        }
        shareDesktopRef.current.onclick=async ()=>{
            const tempStream = await captureScreen();
            setSelfStream(tempStream);

            for(const key in connectionsRef.current){
                tempStream.getTracks().forEach((track)=>{
                    connectionsRef.current[key].addTrack(track,tempStream);
                });
            }
        }
        
        
    },[message]);
    
    
    useEffect(()=>{ 
        

        socketRef.current.on('chat',(data)=>{
            console.log(`message recieved ${data}`);
            setChats(prev=>{
                return [...prev,data]
            })
        });

        

        
        socketRef.current.on('answer',async({answer,target})=>{
            await connectionsRef.current[target].setRemoteDescription(new RTCSessionDescription(answer));            
        })
        
        socketRef.current.on("ice-candidate", ({incoming,target})=> {
            const candidate = new RTCIceCandidate(incoming);
            connectionsRef.current[target].addIceCandidate(candidate);
        });
        
        socketRef.current.on("user-disconnected",userSocketID=>{
            setStreams(lastVal=>{
                return lastVal.filter(elem=> elem.target !== userSocketID );
            })
        })
        socketRef.current.on('offer',async({offer,target})=>{ //start of peer B
            console.log('offer recieved');
            const sdp= new RTCSessionDescription(offer);
            if(!connectionsRef.current[target]){
                connectionsRef.current[target]=createPeer(target);
            }
            await connectionsRef.current[target].setRemoteDescription(sdp);
            const answer = await connectionsRef.current[target].createAnswer();
            await connectionsRef.current[target].setLocalDescription(answer);
            socketRef.current.emit('answer',{
                answer:answer,
                target:target
            });

        })

    },[]);
    
    useEffect(()=>{
            socketRef.current.on('new-user-joined',async(target)=>{ //start of peer A
                connectionsRef.current[target]=createPeer(target);
                if(selfStream){
                    console.log('last stream');
                    selfStream.getTracks().forEach((track)=>{
                        connectionsRef.current[target].addTrack(track,selfStream);
                    });
                }
                else{

                    const offer=await connectionsRef.current[target].createOffer();
                    await connectionsRef.current[target].setLocalDescription(offer);
                    socketRef.current.emit('offer',{
                        offer:connectionsRef.current[target].localDescription,
                        target:connectionsRef.current[target].target
                    });
                }
        })
    },[selfStream]);


    const handleSubmit=(e)=>{
        e.preventDefault();
        socketRef.current.emit('join-room',{
            username:username,
            roomID:room
        })
    }

    const handleInput=(e,setter)=>{
        setter(e.target.value);
    }
    return (
        <Paper square className="container">
            <div className="main">
                <form onSubmit={handleSubmit} className="formContainer">
                    <InputBase value={username} onChange={(e)=>{handleInput(e,setUsername)}} placeholder="username..."/><br />
                    <InputBase value={room} onChange={(e)=>{handleInput(e,setRoom)}} placeholder="room..."/>
                    <Button type="submit">Join</Button>
                </form>
                {/* <div className="streamsContainer" style={{gridTemplateColumns:`repeat(${Math.floor(Math.log(streams.length>2 ? streams.length : streams.length-1)/Math.log(2))+1}, minmax(0, 1fr))`}}> */}
                <div className="streamsContainer" style={{gridTemplateColumns:`repeat(${Math.floor(Math.log( (selfStream ? 1 : 0)+streams.length ===1 ? 1 : (selfStream ? 1 : 0)+streams.length ) /Math.log(2))+1}, minmax(0, 1fr))`}}>
                    {
                        selfStream &&
                        (<div className="vidContainer self">
                            <div className="username">You {}</div>
                            <video className="vid" ref={elem=>{if(elem) return elem.srcObject = selfStream}} muted autoPlay playsInline></video> 
                        </div>)
                    }
                    {
                        streams.map(({stream})=>{
                            return (
                                <div className="vidContainer" key={stream.id}>
                                    <div className="username">ID: {stream.id.slice(0,10)}... </div>
                                    <video className="vid"  ref={elem=>{if(elem) return elem.srcObject=stream}} muted autoPlay playsInline></video>
                                </div>                    
                            )
                        })
                    } 
                </div>
                
            </div>
            <Paper square className={classes.chatbox}>
                <div className="messages">
                    <List 
                        subheader={<ListSubheader component="div">CHAT</ListSubheader>}
                    >
                        {
                            chats.map((chat,index)=>{
                                return (
                                    <ListItem key={index}>
                                        {
                                            chat.avatar &&
                                            (<ListItemAvatar>
                                                <Avatar alt={`${chat.handle} avatar`} src={chat.avatar} />
                                            </ListItemAvatar>) 
                                        }
                                        <ListItemText primary={chat.handle} secondary={<Typography variant="body2" noWrap color="textSecondary">{chat.message}</Typography>} />
                                        <ListItemSecondaryAction>
                                            <div className="status">
                                                {chat.date}
                                            </div>
                                        </ListItemSecondaryAction>
                                    </ListItem>

                                )
                            })
                        }
                    </List>
                </div>
                <form className="form" ref={messageFormRef}>
                    <InputBase
                        className="input"
                        placeholder="Message..."
                        value={message}
                        onChange={handleChange}
                        variant="outlined"
                    />
                    <IconButton type="submit" aria-label="Send Message">
                        <MessageIcon/>
                    </IconButton>
                </form>
            </Paper>
            <Paper
                className={classes.nav}
            >
                <IconButton 
                    onClick={()=>{toggleStreamTrack(selfStream,'audio',micIsSharing);setMicIsSharing(!micIsSharing)}}
                    aria-label="Share Microphone"
                >
                    { micIsSharing ? <MicrophoneIcon /> : <MicrophoneDisableIcon/> }
                </IconButton>                
                
                <IconButton 
                    onClick={()=>{toggleStreamTrack(selfStream,'video',desktopIsSharing);setDesktopIsSharing(!desktopIsSharing)}}
                    aria-label="Share Desktop" 
                    ref={desktopButtonRef}
                >
                    {desktopIsSharing ? <DesktopIcon /> : <DesktopDesableIcon/>}
                </IconButton>                    
                
                {/* <IconButton onClick={()=>{props.setDarkTheme(!props.darkTheme)}} aria-label="theme">
                    { props.darkTheme ? <SunIcon/> : <MoonIcon /> } 
                </IconButton>                */}

                {/* <IconButton ref={hangupBtnRef} aria-label="hangup" className="bgRed" >
                    <HangupIcon />
                </IconButton> */}
                <Button ref={shareBtnRef}>
                    Share webcam
                </Button>
                <Button ref={shareDesktopRef}>
                    Share Desktop
                </Button>
            </Paper>

        </Paper>
    )
}


    // const toggleMic=(enable)=>{
    //     desktopStream.getAudioTracks()[0].enabled = enable;
    //     setMicIsOn(enable);
    // }
    
    // const mixScreenAudio=(enable)=>{//will mix audio with shared desktop
    //     if(enable){
    //         captureScreen()
    //         .then((stream)=>{
    //             captureMic()
    //             .then(micStream=>{
    //                 stream.addTrack(micStream.getAudioTracks()[0])
    //                 screenVidRef.current.srcObject=stream;
    //                 setDesktopStream(stream);
    //                 setDesktopIsSharing(true);
    //             })
    //             .catch(()=>{
    //                 console.error(`Error happens capturing micrphone`);
    //             })
    //         })
    //         .catch(()=>{
    //             console.error(`Error happens capturing desktop`)
    //         })
    //     }
    //     else{
    //         stopCapture(screenVidRef.current);
    //         setDesktopIsSharing(false);
    //         setDesktopStream(null);
    //         setMicIsOn(true);
    //     }
    // }