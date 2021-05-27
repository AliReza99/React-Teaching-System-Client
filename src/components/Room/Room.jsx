import React,{useEffect,useState,useRef} from 'react';
import "./Room.scss";
import {io} from "socket.io-client";
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
    IconButton
    
} from "@material-ui/core";
import {
    CallEndRounded as HangupIcon,
    MicRounded as MicrophoneIcon,
    SendRounded as MessageIcon,
    Brightness2Rounded as MoonIcon,
    WbSunnyRounded as SunIcon,
    DesktopMacRounded as DesktopIcon,
    DesktopAccessDisabled as DesktopDesableIcon,
    MicOffRounded as MicrophoneDisableIcon
} from "@material-ui/icons";
import {makeStyles} from "@material-ui/core/styles";



const socket = io('http://localhost:5001');
const randID=Math.floor(Math.random()*1000); //generate random ID for user


const stopCapture=(vidElem)=>{
    let tracks = vidElem.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    vidElem.srcObject = null;
}
const captureScreen=()=>{
    return new Promise((resolve, reject) =>{
        navigator.mediaDevices.getDisplayMedia({video:true})
        .then(currentStream=>{
            resolve(currentStream);
        })
        .catch(() =>{
            reject();
        })

    }) 
        
}
const captureMic=()=> {
    return new Promise((resolve,reject) => {
        navigator.mediaDevices.getUserMedia({audio:true})
        .then(currentStream=>{
            resolve(currentStream);
        })
        .catch(() =>{
            reject();
        })
    });
}
// const captureWebcam=()=> {
//     return new Promise((resolve,reject) => {
//         navigator.mediaDevices.getUserMedia({video:true,audio:true})
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
        chatbox:{
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
                borderTop:"2px solid rgba(0,0,0,.2)"
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
    const [micIsOn,setMicIsOn]=useState(true);
    const [chats,setChats] = useState([]);
    const [desktopStream,setDesktopStream]=useState(null);

    const screenVidRef = useRef(null);

    const classes=useStyle();
    
    useEffect(()=>{
        socket.on('chat',(data)=>{
            console.log(data)
            setChats(prev=>{
                return [...prev,data]
            })
        });
        
        // socket.on('typing',(data)=>{
        //     feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>';
        // });
        
    },[]);



    


    const handleSubmitMessage=(e)=>{
        e.preventDefault();
        if(message.trim()===""){//if it was empty message 
            return;
        }
        socket.emit('chat', {
            message: message.trim(),
            handle: `user${randID}`
        });
        setMessage("");
    }
    
    const handleChange=(e)=>{
        setMessage(e.target.value);
    }

    const toggleMic=(enable)=>{
        desktopStream.getAudioTracks()[0].enabled = enable;
        setMicIsOn(enable);
    }
    
    const mixScreenAudio=(enable)=>{//will mix audio with shared desktop
        if(enable){
            captureScreen()
            .then((stream)=>{
                captureMic()
                .then(micStream=>{
                    stream.addTrack(micStream.getAudioTracks()[0])
                    screenVidRef.current.srcObject=stream;
                    setDesktopStream(stream);
                    setDesktopIsSharing(true);
                })
                .catch(()=>{
                    console.error(`Error happens catching micrphone`);
                })
            })
            .catch(()=>{
                console.error(`Error happens catching desktop`)
            })
        }
        else{
            stopCapture(screenVidRef.current);
            setDesktopIsSharing(false);
            setDesktopStream(null);
            setMicIsOn(true);
        }
    }

    return (
        <Paper square className="container">
            <div className="main">
                <video style={{width:"95%"}} autoPlay ref={screenVidRef} className="vid"></video>
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
                <form className="form" onSubmit={handleSubmitMessage}>
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
                <IconButton onClick={()=>{toggleMic(!micIsOn)}} aria-label="Share Microphone">
                    { micIsOn ? <MicrophoneIcon /> : <MicrophoneDisableIcon/> }
                </IconButton>                
                
                <IconButton aria-label="Share Desktop" onClick={()=>{mixScreenAudio(!desktopIsSharing)}}>
                    {desktopIsSharing ? <DesktopIcon /> : <DesktopDesableIcon/>}
                </IconButton>                    
                
                <IconButton onClick={()=>{props.setDarkTheme(!props.darkTheme)}} aria-label="theme">
                    { props.darkTheme ? <SunIcon/> : <MoonIcon /> } 
                </IconButton>               

                <IconButton aria-label="hangup" className="bgRed">
                    <HangupIcon />
                </IconButton>
            </Paper>

        </Paper>
    )
}