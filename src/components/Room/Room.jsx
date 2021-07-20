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
    ListItemText,
    Typography,
    ListItemSecondaryAction,
    IconButton,
    Button,
    Divider
    
} from "@material-ui/core";
import {
    // CallEndRounded as HangupIcon,
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

class Message{
    constructor(sender,text,date){
        this.sender=sender;
        this.text=text;
        this.date=new Date(date);

    }
}
class VidStream{
    constructor(stream,target,username){
        this.stream=stream;
        this.target=target;
        this.username=username;
    }
}
class User{
    constructor(username,connectionID){
        this.username=username;
        this.connectionID = connectionID;
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
        sidebar:{
            display:"flex",
            flexDirection:"column",
            position:"fixed",
            width:"420px",
            height:"calc(100vh - 65px)",
            right:"0",
            top:"0",
            
            "& .form":{
                display:"flex",
            },
            "& .input":{
                flexGrow:"1",
                padding:`5px ${theme.spacing(1)}px`,
            },
            "& .messages":{
                overflowY:"scroll",
                flexGrow:1
            },
            "& .listHeader, & .form":{
                background:"#21242B" //dark background 
            }
        },

    }
})

export default function Room(props) {
    const [message,setMessage] = useState("");
    const [desktopIsSharing,setDesktopIsSharing]=useState(false);
    const [micIsSharing,setMicIsSharing]=useState(true);
    const [isCanvasSharing,setIsCanvasSharing]=useState(false);
    const [chats,setChats] = useState([]);
    const messageFormRef=useRef(null);
    const shareDesktopRef=useRef(null);
    const whiteboardBtnRef=useRef(null);
    const whiteboardRef=useRef(null);
    const loadImageRef=useRef(null);
    const [users,setUsers] = useState([]);
    const [isJoinedRoom,setIsJoinedRoom] = useState(false);
    const [usernameInput,setUsernameInput] = useState("");
    const [room,setRoom] = useState("room1");
    const [streams,setStreams]= useState([]);
    const socketRef=useRef(null);
    const desktopButtonRef=useRef(null);
    const shareBtnRef=useRef(null);
    const [selfStream,setSelfStream] = useState(null);
    const connectionsRef=useRef({});
    const [usernameInRoom,setUsernameInRoom] = useState(null);
    

    const classes=useStyle();
    




    


    
    const handleChange=(e)=>{
        setMessage(e.target.value);
    }



    
    
    const handleNegotiationNeeded=async(pc)=> {
        const offer=await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('offer',{
            offer:pc.localDescription,
            target:pc.target
        });
    }
    const addStreams=useCallback((e,target,username)=>{
        console.log('addstreams ',username);
        const newStream= new VidStream(e.streams[0],target,username);
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

    const createPeer=(target,username)=>{
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
        peer.ontrack = (e)=>{addStreams(e,target,username)};
        peer.onnegotiationneeded = () =>{handleNegotiationNeeded(peer)};
        peer.target=target;
        // peer.username=username;
    
        return peer;
    };


    
    useEffect(()=>{
        socketRef.current=io(SOCKET_ENDPOINT);
        socketRef.current.on('connect',()=>{
            console.log('socket connection established');
        })

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
        whiteboardBtnRef.current.onclick=()=>{
            const canvasStream = whiteboardRef.current.captureStream(30);
            const canvasTrack = canvasStream.getVideoTracks()[0];
            for(const key in connectionsRef.current){
                connectionsRef.current[key].addTrack(canvasTrack,canvasStream);
            }
            setSelfStream(canvasStream);
            setIsCanvasSharing(true);
        }
        
        return()=>{
            socketRef.current.close();
        }
    },[]);

    useEffect(()=>{
        const myCanvas= whiteboardRef.current;
        const ctx = myCanvas.getContext("2d");

        let isDrawing = false;
        let x = 0;
        let y = 0;


        myCanvas.addEventListener('mousedown', e => {
            x = e.offsetX;
            y = e.offsetY;
            isDrawing = true;
        });
        
        function drawLine(ctx, x1, y1, x2, y2) {
            ctx.beginPath();
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.closePath();
        }
        
        myCanvas.addEventListener('mousemove', e => {
            if (isDrawing === true) {
                drawLine(ctx, x, y, e.offsetX, e.offsetY);
                x = e.offsetX;
                y = e.offsetY;
            }
        });
        
        myCanvas.addEventListener('mouseup', e => {
            if (isDrawing === true) {
                drawLine(ctx, x, y, e.offsetX, e.offsetY);
                x = 0;
                y = 0;
                isDrawing = false;
            }
        });

    },[])
    
    useEffect(()=>{
        messageFormRef.current.onsubmit=(e)=>{
            e.preventDefault();
            if(message.trim()===""){//if it was empty message 
                return;
            }
            socketRef.current.emit('chat', {
                text: message.trim(),
            });
            setMessage("");
        };


        
        
    },[message]);
    

    
    useEffect(()=>{ 
        

        socketRef.current.on('chat',({sender,text,date})=>{
            const msg=new Message(sender,text,date);
            console.log(`new message recieved`,msg);
            setChats(prev=>{
                return [...prev,msg]
            })
        });

        

        
        socketRef.current.on('answer',async({answer,target})=>{
            await connectionsRef.current[target].setRemoteDescription(new RTCSessionDescription(answer));            
        })
        
        socketRef.current.on("ice-candidate", ({incoming,target})=> {
            const candidate = new RTCIceCandidate(incoming);
            connectionsRef.current[target].addIceCandidate(candidate);
        });
        

        socketRef.current.on('offer',async({offer,target,username})=>{ //start of peer B
            const sdp= new RTCSessionDescription(offer);
            console.log('offer username',username);
            if(!connectionsRef.current[target]){
                connectionsRef.current[target]=createPeer(target,username);
                const newUser = new User(username,target);
                setUsers((lastVal)=>{
                    return [...lastVal,newUser]
                })
                console.log('new user added');
                
            }
            await connectionsRef.current[target].setRemoteDescription(sdp);
            const answer = await connectionsRef.current[target].createAnswer();
            await connectionsRef.current[target].setLocalDescription(answer);
            socketRef.current.emit('answer',{
                answer:answer,
                target:target
            });
            
        })

        socketRef.current.on("user-disconnected",userSocketID=>{
            setStreams(lastVal=>{
                return lastVal.filter(stream=> stream.target !== userSocketID );
            });
            setUsers((lastVal)=>{
                return lastVal.filter((user)=> user.connectionID !== userSocketID);
            });

        })
        

    },[]);
    
    useEffect(()=>{
        socketRef.current.on('new-user-joined',async({target,username})=>{ //start of peer A
            console.log('join username',username);
            connectionsRef.current[target]=createPeer(target,username);
            const newUser = new User(username,target);
            setUsers((lastVal)=>{
                return [...lastVal,newUser]
            })
            console.log('new user added');
            if(selfStream){
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
            username:usernameInput,
            roomID:room
        });
        setIsJoinedRoom(true);
        setUsernameInRoom(usernameInput);
    }

    const handleInput=(e,setter)=>{
        setter(e.target.value);
    }
    const handleFileChange=()=>{
        const ctx = whiteboardRef.current.getContext("2d");
        const file = loadImageRef.current.files[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload=(e)=>{
            if(e.target.readyState === FileReader.DONE){
                const img = new Image();
                img.src = e.target.result;
                img.onload=()=>{
                    ctx.drawImage(img,0,0,560,360);
                }
            }
        }
    }
    return (
        <Paper square className="container">
            <div className="main">
                <form onSubmit={handleSubmit} className="formContainer">
                    <InputBase value={usernameInput} onChange={(e)=>{handleInput(e,setUsernameInput)}} required  placeholder="username..."/><br />
                    <InputBase value={room} onChange={(e)=>{handleInput(e,setRoom)}} required placeholder="room..."/>
                    <Button type="submit">Join</Button>
                </form>
                <div className="streamsContainer" style={{gridTemplateColumns:`repeat(${Math.floor(Math.log( (selfStream ? 1 : 0)+streams.length ===1 ? 1 : (selfStream ? 1 : 0)+streams.length ) /Math.log(2))+1}, minmax(0, 1fr))`}}>
                    <div className="vidContainer self whiteboardContainer" style={{display:isCanvasSharing? "flex" : "none"}}>
                        <canvas width="560" height="360" className="vid" id="whiteboard" ref={whiteboardRef} ></canvas>
                        <div className="buttonsContainer">
                            <Button component="label">
                                Image
                                <input type="file" onChange={handleFileChange} ref={loadImageRef} hidden/>
                            </Button>
                        </div>
                        {/* <Button onClick={handleFileChange}>Set</Button> */}

                    </div> 
                    {
                        selfStream && ! isCanvasSharing &&
                        (<div className="vidContainer self">
                            <div className="username">You</div>
                            <video className="vid" ref={elem=>{if(elem) return elem.srcObject = selfStream}} muted autoPlay playsInline></video> 
                        </div>)
                    }
                    {
                        streams.map(({stream,username})=>{
                            
                            return (
                                <div className="vidContainer" key={stream.id}>
                                    <div className="username">{username} </div>
                                    <video className="vid"  ref={elem=>{if(elem) return elem.srcObject=stream}} muted autoPlay playsInline></video>
                                </div>                    
                            )
                        })
                    } 
                </div>
                
            </div>
            <Paper square className={classes.sidebar}>
                <div className="users">
                    <List 
                        subheader={<ListSubheader component="div" className="listHeader">Users</ListSubheader>}
                        style={{maxHeight:"300px",overflowY:"scroll",}}
                        
                    >
                        {
                            isJoinedRoom && 
                                <ListItem>
                                    <ListItemText primary={usernameInRoom}/>
                                </ListItem>
                        }
                        {
                            users.map((user)=>{
                                return (
                                    <ListItem key={user.connectionID}>
                                        <ListItemText primary={user.username}/>
                                    </ListItem>
                                )
                            })
                        }                       
                    </List>
                </div>    
                <Divider />            
                <div className="messages">
                    <List 
                        subheader={<ListSubheader className="listHeader" component="div">CHAT</ListSubheader>}
                        disablePadding
                    >
                        {
                            chats.map((chat,index)=>{
                                return (
                                    <ListItem key={index}>
                                        <ListItemText primary={chat.sender} secondary={<Typography variant="body2" noWrap color="textSecondary">{chat.text}</Typography>} />
                                        <ListItemSecondaryAction>
                                            <div className="status">
                                                {chat.date.getHours() + ":" + chat.date.getMinutes()}
                                            </div>
                                        </ListItemSecondaryAction>
                                    </ListItem>

                                )
                            })
                        }
                    </List>
                </div>
                <Divider />
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
                
                <Button ref={shareBtnRef}>
                    Share webcam
                </Button>
                <Button ref={shareDesktopRef}>
                    Share Desktop
                </Button>
                <Button ref={whiteboardBtnRef}>
                    Create Whiteboard
                </Button>
                {/* <IconButton onClick={()=>{props.setDarkTheme(!props.darkTheme)}} aria-label="theme">
                    { props.darkTheme ? <SunIcon/> : <MoonIcon /> } 
                </IconButton>                */}

                {/* <IconButton ref={hangupBtnRef} aria-label="hangup" className="bgRed" >
                    <HangupIcon />
                </IconButton> */}
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