import React,{useEffect,useState,useRef} from 'react';
import "./Room.scss";
import {io} from "socket.io-client";
import {
    // BottomNavigation,
    // BottomNavigationAction,
    // Box,
    Paper,
    TextField,
    Button,
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
    // Restore as RestoreIcon,
    CallEndRounded as HangupIcon,
    // MoreVertRounded as MoreIcon,
    MicRounded as MicrophoneIcon,
    // VideocamRounded as VideoIcon,
    SendRounded as MessageIcon,
    Brightness2Rounded as MoonIcon,
    WbSunnyRounded as SunIcon,
    DesktopMacRounded as DesktopIcon,
    DesktopAccessDisabled as DesktopDesableIcon,
    MicOffRounded as MicrophoneDisableIcon
} from "@material-ui/icons";
import {makeStyles} from "@material-ui/core/styles";



const socket = io('http://localhost:5001');
const randID=Math.floor(Math.random()*1000); //generate random ID


const stopCapture=(vidElem)=>{
    let tracks = vidElem.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    vidElem.srcObject = null;
}
const captureScreen=(vidElem)=>{
    return new Promise((resolve, reject) =>{
        navigator.mediaDevices.getDisplayMedia({video:true,audio:true})
        .then(currentStream=>{
            vidElem.srcObject=currentStream;
            resolve();
        })
        .catch(() =>{
            reject();
        })

    }) 
        
}
// const captureWebcam=(vidElem)=> {
//     return new Promise((resolve,reject) => {
//         navigator.mediaDevices.getUserMedia({video:{ exact: 720 }, height: { exact: 720 },audio:true})
//         .then(currentStream=>{
//             vidElem.srcObject=currentStream;
//             resolve()
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
            
            "& .inputs":{
                position:"absolute",
                bottom:"0",
                width:"100%"
            },
            "& .input":{
                width:"100%",
                borderRadius:"50%",
                "&:focus":{
                    border:"none"
                }
            },
            "& .button":{
                width:"100%",
                padding:"15px 0",
                background:"#111",
                color:"#fff"
            }
            // "& .status":{
            //     color:theme.palette.text.secondary
            // },

            // "& .emptyContainer":{
            //     display:"flex",
            //     flexDirection:"column",
            //     alignItems:"center",
            //     justifyContent:"center",
            //     padding:"70px 0",
            //     color:theme.palette.text.secondary,

            //     "& .imgContainer":{
            //         marginBottom:"15px",
            //         width:"60%",

            //         "& img":{
            //             width:"100%"
            //         }
            //     },
                
            // }

        },

    }
})

export default function Room(props) {
    const [message,setMessage] = useState("");
    const [desktopIsSharing,setDesktopIsSharing]=useState(false);
    const [microphoneIsOn,setMicrophoneIsOn]=useState(false);
    const [chats,setChats] = useState([]);

    const screenVidRef = useRef(null);
    // const webcamVidRef = useRef(null);

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

    // useEffect(()=>{

    //     // captureWebcam(webcamVidRef.current)
    //     // .then(()=>{
    //     //     stopCapture(webcamVidRef.current)
    //     // })

    const shareDesktop=(enable)=>{
        if(enable){
            captureScreen(screenVidRef.current)
            .then(()=>{
                setDesktopIsSharing(true)
            })
            
        }
        else{
            stopCapture(screenVidRef.current);
            setDesktopIsSharing(false);
        }
    }



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
    
    return (
        <Paper square className="container">
            <div className="main">
                {/* <video  muted autoPlay ref={webcamVidRef} className="vid cam"></video> */}
                <video style={{width:"100%",height:"100%"}} muted autoPlay ref={screenVidRef} className="vid "></video>
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
                <form className="inputs" onSubmit={handleSubmitMessage}>
                    {/* <input value={message} onChange={handleChange} type="text" placeholder="Message..." /> */}
                    <TextField
                        className="input"
                        placeholder="Message..."
                        value={message}
                        onChange={handleChange}
                        variant="outlined"
                    />
                    <Button size="large" type="submit" className="button" endIcon={<MessageIcon/>}>Send</Button>                    
                </form>
            </Paper>
            <Paper
                className={classes.nav}
            >
                <IconButton aria-label="Share Microphone">
                    { microphoneIsOn ? <MicrophoneIcon /> : <MicrophoneDisableIcon/> }
                </IconButton>                
                
                <IconButton aria-label="Share Desktop" onClick={()=>{desktopIsSharing ? shareDesktop(false) : shareDesktop(true)}}>
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