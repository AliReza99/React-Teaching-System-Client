import React,{useEffect,useState,useRef,useCallback,memo} from 'react';
import "./Room.scss";
// import {io} from "socket.io-client";
import {makeStyles} from "@material-ui/core/styles";
import { BlockPicker } from 'react-color';
import {
    Paper,
    InputBase,
    List,
    ListSubheader,
    ListItem,
    ListItemText,
    Typography,
    IconButton,
    Button,
    InputAdornment,
    Tooltip,
    ClickAwayListener,
    Divider,
} from "@material-ui/core";



import {
    MicRounded as MicrophoneIcon,
    SendRounded as SendIcon,
    DesktopMacRounded as DesktopIcon,
    DesktopAccessDisabled as DesktopDesableIcon,
    MicOffRounded as MicrophoneDisableIcon,
    CheckRounded as TickIcon,
    Close as CloseIcon,
    Gesture as GestureIcon,
    ShowChartTwoTone as LineIcon,
    Crop32 as SquareIcon,
    FiberManualRecordOutlined as CircleIcon,
    TextFields as TextIcon,
    InsertPhoto as ImageIcon,
    ColorLens as ColorIcon,
    BorderColorRounded as PenIcon,
    CallEndRounded as HangupIcon,
    ChatRounded as ChatIcon,
    FastForwardRounded as FastForwardIcon,
    ClearAll as ClearIcon,
    ReplyRounded as ReplyIcon,
    MoreVert as MoreIcon,
    PictureAsPdfRounded as PDFIcon,
    NavigateNextRounded as NextArrow,

} from "@material-ui/icons";
import {
    useRecoilValue,
    useSetRecoilState,
    useRecoilState
} from "recoil";

import ChatListItem from "../ChatListItem/ChatListItem";
import {
    drawText,
    drawCircle,
    drawLine,
    drawRect,
    freehandDraw,
    clearCanvas,
    setCanvasColors
} from "../../scripts/canvasDraw";

import {
    socketState,
    usersState,
    selfState
} from "./Atoms";

const colorsArr=["#000000","#E53935","#CFD8DC","#8E24AA","#303F9F","#0097A7","#FFEB3B","#76FF03","#4FC3F7","#CE93D8"]; // colors for canvas draw

const removeEvents=(element)=>{
    element.onmousedown=null;
    element.onmousemove=null
    element.onmouseup=null;
    element.onclick=null;
}

const useStyle = makeStyles(theme=>{
    return {
        nav:{
            position:"fixed",
            width:"100%",
            bottom:"0",
            background:"hsl(210, 3%, 13%)",
            height:"65px",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            padding:"0 15px",
            "& .items":{
                flex:"1 1 0",
                display:"flex",
            },
            "& .center":{
                justifyContent:"center"
            },
            "& .right":{
                justifyContent:"flex-end"
            },

            "& button":{
                margin:"0 9px",
                background:"hsl(210, 3%, 17%)",
                transition:"background .1s",
                fontSize:"inherit"
            },
            "& .redBackground":{
                background:"#B71C1C",
                "&:hover":{
                    background:"#dd2323"
                }
            },
        },


    }
});
const useStyle2=makeStyles(theme=>{
    return {
        sidebar:{
            display:"flex",
            flexDirection:"column",
            position:"fixed",
            width:"420px",
            height:"calc(100vh - 65px)",
            // right:"-100%",
            right:"0",
            top:"0",
            visibility:"hidden",
            borderRadius:"10px 0 0 10px",
            padding:"0px 0",
            transform:"translateX(100%)",
            transition:"visibility .2s,right .3s,transform .3s",
            // margin:"15px 0",
            // background:"hsl(210, 3%, 19%)",
            "&.show":{
                // right:"0",
                transform:"translateX(0)",
                visibility:"visible",
                
            },
            "& .inputContainer":{
                display:"flex",
                background:"#2B2E2F",
                margin:"8px 8px",
                borderRadius:"30px",
                padding:"1px 0 1px 10px "
            },
            "& .btnsContainer":{
                padding:"3px 8px",
                display:"flex",
                margin:"5px 0"
            },
            
            "& .input":{
                flexGrow:"1",
                padding:`0 10px`,
            },
            "& .messages":{
                overflowY:"scroll",
                flexGrow:1
            },
            "& .listHeader":{
                background:"#262829",
            },
        },
    }
})
class Message{
    constructor(id,sender,text,date,role,rate,hardness,repliedID){
        this.id=id;
        this.sender=sender;
        this.text=text;
        this.date=new Date(date);
        this.role=role;
        this.rate=rate;
        this.hardness=hardness;
        this.repliedID=repliedID;
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

const Timer = memo(()=>{
    const [timer,setTimer] = useState(new Date());
    const updateTimer=()=>{
        setTimer(new Date());
    }
    
    useEffect(()=>{
        const intervalID=window.setInterval(updateTimer,60000);

        return ()=>{
            window.clearInterval(intervalID);
        }
    },[]);

    return(
        <>
            {   
                `${timer.getHours()<10 ? "0" : ""}${ timer.getHours()>12 ? timer.getHours() - 12 : timer.getHours() }:${timer.getMinutes()<10 ? "0" : ""}${timer.getMinutes()}  ${timer.getHours()>12 ? "PM" : "AM"} `
            }
        </>
    )
})

const Drawer = memo(({showChat,setShowChat})=>{
    const [chats,setChats] = useState([]);
    //role: message | question | answer
    const [msgRole,setMsgRole] = useState('message');
    const [questionHardness,setQuestionHardness] = useState(5);
    const [selectedQuestionID,setSelectedQuestionID] = useState(null);
    const [messageInput,setMessageInput] = useState("");

    const socket = useRecoilValue(socketState);
    const users = useRecoilValue(usersState);
    const self = useRecoilValue(selfState);

    const messageInputRef = useRef(null);

    const classes = useStyle2();
    
    const selectQuestion=(questionID)=>{
        setSelectedQuestionID(questionID);
        messageInputRef.current.focus();
    }
    const rateMessage=(rate,messageID)=>{
        socket.emit('rate-message',{
            messageID:messageID,
            rate:rate
        })
    } 
    const sendMessages=(e)=>{
        e.preventDefault();
        if(messageInput.trim()===""){//if it was empty message 
            return;
        }
        const data={
            text:messageInput.trim(),
        }
        if(self.isAdmin){
            if(msgRole==='question'){
                data.hardness=questionHardness;
            }
        }
        if(selectedQuestionID){
            data.repliedID=selectedQuestionID;
        }
        socket.emit('chat', data);
        setMessageInput("");
        setSelectedQuestionID(null);
    }

    useEffect(()=>{
        if(!selectedQuestionID){
            setMsgRole("message")
        }
    },[selectedQuestionID]);
    
    useEffect(()=>{

        
        
        socket.on('chat',({sender,text,date,id,role,rate,hardness,repliedID})=>{ // recieve new chat message
            const msg=new Message(id,sender,text,date,role,rate,hardness,repliedID);
            setChats(prev=>{
                return [...prev,msg]
            });
            // messageContainerRef.current.scrollTop=10000;//scroll to button after new message
            
        });
    
        socket.on('full-chat-update',(chatsArr)=>{ //recieve previous chats 
            const dateCorrectedArr= chatsArr.map((chat)=>new Message(chat.id,chat.sender,chat.text,chat.date,chat.role,chat.rate,chat.hardness,chat.repliedID));
            setChats(()=>{
                return dateCorrectedArr;
            });
            if(dateCorrectedArr.length ===0){ //if message replied but chat was cleared , replied message unselected
                setSelectedQuestionID(null);
            }
        });
    
        socket.on("update-message",(message)=>{ //single chat message update 
            setChats((lastChats)=>{
                const index= lastChats.findIndex((chat)=>chat.id===message.id);
    
                if(index !== -1){
                    const newMsg={...lastChats[index]};
                    newMsg.rate=message.rate;
                    const newArr = [ 
                        ...lastChats.slice(0,index),
                        newMsg,
                        ...lastChats.slice(index+1)
                    ];
                    // console.log(newArr);
    
                    return newArr;
    
                }
                return lastChats;
            })
        });
    },[])
    
    
    return (
        <Paper square className={[classes.sidebar,showChat ? "show" : ""].join(" ")}>
            <div className="users">
                <List 
                    subheader={<ListSubheader component="div" className="listHeader">People {users.length > 0 ? `(${users.length+1})` : ""} <IconButton style={{float:"right"}} onClick={()=>setShowChat(false)}><CloseIcon /></IconButton></ListSubheader>}
                    style={{maxHeight:"300px",overflowY:"scroll",}}
                >
                    {
                        self.username.length >0 &&
                        <ListItem>
                            <ListItemText className="selfUserContainer" primary={<Typography component="div">{self.username} <span className="caption"> &nbsp; You</span> </Typography>} />
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
            <div className="messages" >
                <List 
                    subheader={<ListSubheader className="listHeader" component="div">Messages {chats.length>0 ? `(${chats.length})` : ""}</ListSubheader>}
                    disablePadding
                >
                    {
                        chats.map((chat)=>{
                            let role=chat.role;
                            let onClick=null;
                            let repliedText=chats.filter((elem)=>elem.id===chat.repliedID)[0]?.text;
                            let rate = chat.rate || 0;
                            
                            
                            if(role==="question"){
                                onClick=()=>{
                                    selectQuestion(chat.id);
                                    setMsgRole('answer');
                                }
                            }
                            const ratingOnChange=(value)=>{
                                rateMessage(value,chat.id);
                            }

                            return (
                                <ChatListItem key={chat.id} id={chat.id} rate={rate} ratingOnChange={ratingOnChange} sender={chat.sender} repliedText={repliedText} hardness={chat.hardness} role={role} onClick={onClick} text={chat.text} date={chat.date} isAdmin={self.isAdmin} />
                            )
                        })
                    }
                </List>
            </div>
            {
                    selectedQuestionID &&
                    (
                        <>
                        <Divider />
                        <div className="replyContainer">
                            <span><ReplyIcon /></span>
                            <span className="text">
                                <span>&nbsp; Question: &nbsp;</span>
                                {
                                    chats.filter((chat)=>chat.id===selectedQuestionID)[0]?.text
                                }
                            </span>
                            <IconButton size="small" onClick={()=>{setSelectedQuestionID(null)}} style={{float:"right"}} ><CloseIcon /></IconButton>
                        </div>
                        </>
                    )
            }
            <form className="form" onSubmit={sendMessages}>
                <div className="inputContainer">
                    <InputBase
                        className="input"
                        placeholder={selectedQuestionID ? "Reply..." :"Message..." }
                        value={messageInput}
                        onChange={(e)=>{setMessageInput(e.target.value)}}
                        variant="outlined"
                        inputProps={{
                            ref:messageInputRef
                        }}
                        // multiline
                        // maxRows={3}
                    />
                    <IconButton disabled={messageInput.length === 0} type="submit" aria-label="Send Message">
                        <SendIcon/>
                    </IconButton>
                </div>
            </form>
            {
                self.isAdmin && 
                (
                    <div className="btnsContainer">
                        <div className="msgMode">
                            <Button onClick={()=>{setMsgRole('question')}} >Question {msgRole === "question" ? <TickIcon /> : ""} </Button>
                            <Button onClick={()=>{setMsgRole('message')}} >Message {msgRole === "message" ? <TickIcon /> : "" } </Button>
                            {
                                msgRole === 'question' &&
                                (<InputBase 
                                    type="number" 
                                    startAdornment={<InputAdornment position="start" component="label">Hardness: </InputAdornment>}
                                    inputProps={{min:0,max:10}}
                                    onChange={(e)=>{setQuestionHardness(e.target.value)}}
                                    value={questionHardness}
                                />)
                            }
                        </div>
                    </div>
                )
            }
        </Paper>
    );
})

export default function Room(props) {
    const [room,setRoom] = useState("room1");
    const [usernameInput,setUsernameInput] = useState("");
    const [desktopIsSharing,setDesktopIsSharing]=useState(false);
    const [micIsSharing,setMicIsSharing]=useState(false);
    const [isCanvasSharing,setIsCanvasSharing]=useState(false);
    const [streams,setStreams]= useState([]);
    const [selfStream,setSelfStream] = useState(null);
    const [selectedCanvasButton,setSelectedCanvasButton] = useState(4);
    const [pickedColor,setPickedColor]= useState(colorsArr[0]);
    const [showColorPicker,setShowColorPicker]=useState(false);
    const [isShowFastplay,setIsShowFastplay] = useState(false);
    // const [isPreviousWhiteboardRecieved,setIsPreviousWhiteboardRecieved]=useState(false);
    const [isFullWbDataFetched,setIsFullWbDataFetched]=useState(false);
    const [fastplaySender,setFastplaySender] = useState("");
    const [wbSender,setWbSender]=useState("");
    const [isWhiteboardSharing,setIsWhiteboardSharing] = useState(false);
    const [roomName,setRoomName] = useState("")
    const [showChat,setShowChat] = useState(true);
    const [showMore,setShowMore] = useState(false);
    
    const isPrevWBrecieved=useRef(false);
    const connectionsRef=useRef({});
    const whiteboardRef=useRef(null);
    const fileInputRef=useRef(null);
    const whiteboardImgRef= useRef(null);
    const fastplayImgRef= useRef(null);
    const whiteboardDataRef=useRef([]);
    const isFastplayPlaying= useRef(false);
    const PdfInputRef= useRef(false);
    
    const classes=useStyle();

    const socket = useRecoilValue(socketState);
    const setUsers = useSetRecoilState(usersState);
    const [self,setSelf] = useRecoilState(selfState);
    
    const handleNegotiationNeeded=async(pc)=> {
        const offer=await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer',{
            offer:pc.localDescription,
            target:pc.target
        });
    }
    const addStreams=useCallback((e,target,username)=>{
        console.log('addstreams ',username);
        
        setStreams((last)=>{
            const searchedStream = last.filter(val=>val.target === target)[0];

            if(searchedStream){ //if track already existed
                const newTrack = e.streams[0].getAudioTracks()[0] || e.streams[0].getVideoTracks()[0];
                searchedStream.stream.addTrack(newTrack); //add recieved track to last stream from user
                return last; 
            }
            else{
                const newStream= new VidStream(e.streams[0],target,username);
                const newVal=last.filter(val=>val.stream.id !==newStream.stream.id);
                return [...newVal,newStream];
            }
        });
    },[]);
    const handleICECandidateEvent=useCallback((e,pc)=>{
        if(e.candidate){
            socket.emit("ice-candidate", {
                target:pc.target,
                candidate:e.candidate
            });
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

        return peer;
    };


    const shareMicrophone=async()=>{
        let tempStream;
        try{
            tempStream = await captureMic();
        }
        catch(err){
            console.log("Error happens when requesting for capture Microphone",err);
            return;
        }

        const audioTrack = tempStream.getAudioTracks()[0];

        for(const key in connectionsRef.current){
            connectionsRef.current[key].addTrack(audioTrack,tempStream);
        }

        if(selfStream){ //if already has self stream
            selfStream.addTrack(audioTrack,tempStream);
        }
        else{
            setSelfStream(tempStream);
        }
        
        setMicIsSharing(true);
    }
    
    const shareDesktop=async()=>{
        let tempStream;
        try{
            tempStream = await captureScreen();
        }
        catch(err){
            console.log("Error happens when requesting for capture screen",err);
            return;
        }

        const videoTrack = tempStream.getVideoTracks()[0];

        for(const key in connectionsRef.current){
            connectionsRef.current[key].addTrack(videoTrack,tempStream);
        }

        if(selfStream){
            selfStream.addTrack(videoTrack,tempStream);
        }
        else{
            setSelfStream(tempStream);
        }

        setDesktopIsSharing(true);
    }

    useEffect(()=>{
        setCanvasColors(whiteboardRef.current,pickedColor.hex);
    },[pickedColor]);

    
    const shareWhiteboard=()=>{
        //initiate canvas
        clearCanvas(whiteboardRef.current);
        freehandDraw(whiteboardRef.current); //set freehand event as default draw method    

        setIsCanvasSharing(true);
    }

    // useEffect(()=>{
    //     // if(self.isAdmin){
    //         shareWhiteboard();

    //     // }
    // },[]);

    const requestPrevWhiteboardData=()=>{
        socket.emit("full-whiteboard-data");
    }


    const fastplayImgs=async()=>{
        if(isFastplayPlaying.current){ //to avoid multiple fastplay at the same time 
            return;
        }
        setIsShowFastplay(true);
        isFastplayPlaying.current=true; 

        const wbData = whiteboardDataRef.current;
        let wbSender = wbData[0].sender; 
        setFastplaySender(wbSender);
        
        for(let i=0;i<wbData.length;i++){
            
            if(wbSender !== wbData[i].sender){ //change sender name to new sender
                wbSender = wbData[i].sender;
                setFastplaySender(wbSender);
            }
            fastplayImgRef.current.src = wbData[i].base64ImageData;
            await new Promise(r => setTimeout(r, 120)); //wait 100ms
        }
        isFastplayPlaying.current=false; //release fastplay button action
    }
    const fastplay=()=>{
        if(isPrevWBrecieved.current){
            fastplayImgs();
        }
        else{
            requestPrevWhiteboardData();
        }
        
    }

    useEffect(()=>{
        if(isCanvasSharing){
            const quality = .5;
            window.setInterval(()=>{
                const base64ImageData = whiteboardRef.current.toDataURL("image/png",quality);
                socket.emit("whiteboard-data",{base64ImageData:base64ImageData})
            },1000);
        }
    },[isCanvasSharing]);

    
    // const shareWebcam = async()=>{
    //     const tempStream = await captureWebcam();
        
    //     for(const key in connectionsRef.current){
    //         tempStream.getTracks().forEach((track)=>{
    //             connectionsRef.current[key].addTrack(track,tempStream);
    //         });
    //     }
    //     setSelfStream(tempStream);
    // }
    

    const handleSubmit=(e)=>{
        e.preventDefault();
        socket.emit('join-room',{
            username:usernameInput,
            roomID:room
        });
        // setIsJoinedRoom(true);
    }

    const handleInput=(e,setter)=>{
        setter(e.target.value);
    }
    const isFileImage = (file)=> {
        return file && file['type'].split('/')[0] === 'image';
    }
    const handleImageInputChange=()=>{
        const file = fileInputRef.current.files[0];
        if(!isFileImage(file)){
            console.log('selected file is not image format');
            return;
        }
        
        const ctx = whiteboardRef.current.getContext("2d");
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


    const [pdf,setPdf]=useState(null);
    const [pdfTotalPages,setPdfTotalPages] = useState(0);
    const [pageNum,setPageNum] = useState(null);
    
    const handlePdfChange =()=>{
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        // pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
        if(!pdfjsLib){
            console.log('pdfjsLib is not supported');
            return
        }

        const file=PdfInputRef.current.files[0];
        if(file.type !== "application/pdf"){
            console.error(file.name, "is not a pdf file.")
            return;
        }
        const fileReader = new FileReader(); 

        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);

            pdfjsLib.getDocument(typedarray).promise.then(pdfDocument => {
                setPdf(pdfDocument)
                setPdfTotalPages(pdfDocument.numPages);
                setPageNum(1);
            });
            
            

        };
        fileReader.readAsArrayBuffer(file);
    }

    useEffect(()=>{
        if(pdf){
            pdf.getPage(pageNum).then((page)=> {
                let viewport = page.getViewport({scale:1});
                
                // const width=560;
                // const scale = width / viewport.width;
                // viewport = page.getViewport({scale:scale});


                whiteboardRef.current.height = viewport.height;
                whiteboardRef.current.width = viewport.width;

                const renderContext = {
                    canvasContext: whiteboardRef.current.getContext("2d"),
                    viewport: viewport
                    };
                page.render(renderContext);
            })
        }
    },[pageNum,pdf]);

    const nextPage=()=>{
        if(pageNum < pdfTotalPages){
            setPageNum(pageNum+1);
        }
    }
    const prevPage=()=>{
        if(pageNum > 1){
            setPageNum(pageNum - 1);
        }
    }

    const clearChat = ()=>{
        socket.emit('clear-chat');
    }
    
    const exportChatMessages=()=>{
        socket.emit("export-chat");
    }
    const exportUsersActivity=()=>{
        socket.emit("export-activities");
    }
    
    useEffect(()=>{
        socket.on('connect',()=>{
            console.log('socket connection established');
        });

        socket.on("export-chat",(chats)=>{
            console.log('export all chats',chats);
        })        
        socket.on("export-activities",(activities)=>{
            console.log('export all users Activity',activities);
        })
        
        
        socket.on('self-info',(data)=>{
            setSelf(last=>{
                return{
                    ...last,
                    isAdmin:data.isAdmin,
                    username:data.username
                }

            });
            setRoomName(data.roomName);
        });

        socket.on("full-whiteboard-data",(dataArr)=>{ //recieve previously shared WB data
            whiteboardDataRef.current=dataArr;
            setIsFullWbDataFetched(true);
            isPrevWBrecieved.current=true;
            fastplayImgs();
            // setIsPreviousWhiteboardRecieved(true);
        });

        socket.on("whiteboard-data",(data)=>{
            let isPresenting=false;
            setIsCanvasSharing(lastVal=>{
                if(lastVal){
                    isPresenting=true;
                }
                return lastVal;
            })
            
            if(isPrevWBrecieved.current){
                whiteboardDataRef.current.push(data);                
            }

            if(isPresenting){
                console.log('currently presenting');
                setWbSender(data.sender); // will not rerender if sender doesn't changed
            }
            else{
                console.log('currently just watchin');
                whiteboardImgRef.current.src=data.base64ImageData;
                setWbSender(data.sender); // will not rerender if sender doesn't changed
                setIsWhiteboardSharing(true);
            }
        });
        
        
        
        socket.on('new-user-joined',async({target,username})=>{ //start of peer A
            const newUser = new User(username,target);
            connectionsRef.current[target] = createPeer(target,username);
            setUsers((lastVal)=>{
                return [...lastVal,newUser]
            });

            let tempSelfStream;
            setSelfStream(last=>{
                tempSelfStream=last;
                return last;
            });
            if(tempSelfStream){
                tempSelfStream.getTracks().forEach((track)=>{
                    connectionsRef.current[target].addTrack(track,tempSelfStream);
                });
            }
            else{
                const offer=await connectionsRef.current[target].createOffer();
                await connectionsRef.current[target].setLocalDescription(offer);
                socket.emit('offer',{
                    offer:connectionsRef.current[target].localDescription,
                    target:connectionsRef.current[target].target
                });
            }
        })

        socket.on('answer',async({answer,target})=>{ //webrtc answer
            await connectionsRef.current[target].setRemoteDescription(new RTCSessionDescription(answer));            
        });
        
        socket.on('offer',async({offer,target,username})=>{ //webrtc offer //start of peer B
            const sdp= new RTCSessionDescription(offer);
            if(!connectionsRef.current[target]){
                connectionsRef.current[target]=createPeer(target,username);
                const newUser = new User(username,target);
                setUsers((lastVal)=>{
                    return [...lastVal,newUser]
                })
                
            }
            await connectionsRef.current[target].setRemoteDescription(sdp);
            const answer = await connectionsRef.current[target].createAnswer();
            await connectionsRef.current[target].setLocalDescription(answer);
            socket.emit('answer',{
                answer:answer,
                target:target
            });
            
        });

        socket.on("ice-candidate", ({incoming,target})=> { //webrtc iceCandidate
            const candidate = new RTCIceCandidate(incoming);
            connectionsRef.current[target].addIceCandidate(candidate);
        });
        
        socket.on("user-disconnected",userSocketID=>{ //when some user disconnected from room
            setStreams(lastVal=>{ //update streams 
                return lastVal.filter(stream=> stream.target !== userSocketID );
            });
            setUsers((lastVal)=>{//update room users list
                console.log(lastVal);
                return lastVal.filter((user)=> user.connectionID !== userSocketID);
            });
        });

        return()=>{
            socket.close();
        }
    },[]);
    


    return (
        <Paper square className="container">
            <div className="main">
                <form onSubmit={handleSubmit} className="formContainer">
                    <InputBase value={usernameInput} onChange={(e)=>{handleInput(e,setUsernameInput)}} required  placeholder="username..."/><br />
                    <InputBase value={room} onChange={(e)=>{handleInput(e,setRoom)}} required placeholder="room..."/>
                    <Button type="submit">Join</Button>
                </form>
                <div className={["streamsContainer",!showChat ? "expand" : ""].join(" ")} style={{gridTemplateColumns:`repeat(${Math.floor(Math.log( (selfStream ? 1 : 0)+streams.length ===1 ? 1 : (selfStream ? 1 : 0)+streams.length ) /Math.log(2))+1}, minmax(0, 1fr))`}}>
                    <div className={`fastplayContainer ${isShowFastplay ? "show" : "" }`}>
                        <div className="title"> Whiteboard Replay from: <span>{fastplaySender}</span> </div>
                        <IconButton className="closeIconContainer"  onClick={()=>{setIsShowFastplay(false)}} >
                            <CloseIcon fontSize="large"/>
                        </IconButton>
                        <img alt="whiteboard" ref={fastplayImgRef}/>
                    </div>
                    
                    <div className="vidContainer self whiteboardContainer" style={{display:isCanvasSharing? "flex" : "none"}}>
                        
                        <canvas width="560" height="360" className="vid" id="whiteboard" ref={whiteboardRef} ></canvas>
                        <div className="buttonsContainer">
                            <Tooltip title="Add Image" arrow>
                                <Button component="label">
                                    <ImageIcon />
                                    <input type="file" onChange={handleImageInputChange} ref={fileInputRef} hidden/>
                                </Button>
                            </Tooltip>                           

                            
                            <Tooltip title="Add PDF" arrow>
                                <Button component="label">
                                    <PDFIcon />
                                    <input type="file" onChange={handlePdfChange} ref={PdfInputRef} hidden/>
                                </Button>
                            </Tooltip>

                            {
                                pdf &&
                                <>
                                    <Tooltip title="Previous Page" arrow>
                                        <Button onClick={prevPage} disabled={pageNum === 1} >
                                            <NextArrow style={{transform:"rotate(180deg)"}} />
                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="Next Page" arrow>
                                        <Button onClick={nextPage} disabled={pageNum === pdfTotalPages}>
                                            <NextArrow />
                                        </Button>
                                    </Tooltip>
                                </>
                            }
                            <Tooltip title="Line" arrow>
                                <Button className={selectedCanvasButton===0 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(0);removeEvents(whiteboardRef.current);drawLine(whiteboardRef.current); }}>
                                    <LineIcon />
                                </Button>     
                            </Tooltip>

                                                
                            <Tooltip title="Square" arrow>
                                <Button className={selectedCanvasButton===1 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(1);removeEvents(whiteboardRef.current);drawRect(whiteboardRef.current); }}>
                                    <SquareIcon />
                                </Button>                            
                            </Tooltip>
                            
                            <Tooltip title="Circle" arrow>
                                <Button className={selectedCanvasButton===2 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(2);removeEvents(whiteboardRef.current);drawCircle(whiteboardRef.current); }}>
                                    <CircleIcon />
                                </Button>
                            </Tooltip>

                            <Tooltip title="Text" arrow>
                                <Button className={selectedCanvasButton===3 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(3);removeEvents(whiteboardRef.current);drawText(whiteboardRef.current); }}>
                                    <TextIcon />
                                </Button>
                            </Tooltip>
                            
                            <Tooltip title="Draw" arrow>
                                <Button className={selectedCanvasButton===4 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(4);removeEvents(whiteboardRef.current);freehandDraw(whiteboardRef.current); }}>
                                    <GestureIcon />
                                </Button>                            
                            </Tooltip>
                            <Button onClick={()=>{clearCanvas(whiteboardRef.current)}}>
                                Clear
                            </Button>
                            <ClickAwayListener onClickAway={()=>{setShowColorPicker(false)}} >
                                <div className="cp" >
                                    <Button onClick={()=>{setShowColorPicker(val=>!val)}}>
                                        <ColorIcon/>
                                    </Button>
                                        <div className={["colorPickerContainer",showColorPicker ? "show" : ""].join(" ")} >
                                            <BlockPicker color={pickedColor} width={170} onChangeComplete={setPickedColor} colors={colorsArr}/>
                                        </div>
                                </div>
                            </ClickAwayListener>
                            
                        </div>
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
                                    <video className="vid"  ref={elem=>{if(elem) return elem.srcObject=stream}} autoPlay playsInline></video>
                                </div>                    
                            )
                        })
                    } 


                    <div className={["whiteboardImgContainer",isWhiteboardSharing ? "show" : ""].join(" ")}>
                        <div className="title">{wbSender}</div>
                        <img alt="whiteboard" ref={whiteboardImgRef} />
                    </div>                    

                </div>
                
            </div>
            <Drawer showChat={showChat} setShowChat={setShowChat}/>
                        
            <Paper
                className={classes.nav}
            >
                <div className="items">
                    <Timer />
                    | {roomName}
                </div>
                <div className="items center">
                    <IconButton 
                        onClick={()=>{
                            if(!selfStream){ // no video track no mic track
                                console.log('self stream was empty');
                                shareMicrophone();
                            }
                            else{
                                const hasAudio = selfStream.getAudioTracks().length !==0;

                                if(hasAudio){
                                    console.log('has audio track so toggle audio')
                                    toggleStreamTrack(selfStream,'audio',!micIsSharing);
                                    setMicIsSharing(!micIsSharing)
                                }
                                else{
                                    shareMicrophone();
                                }
                            }
                        }}
                        aria-label="Share Microphone"
                        className={!micIsSharing ? "redBackground" : ""}
                    >
                        { micIsSharing ? <MicrophoneIcon /> : <MicrophoneDisableIcon/> }
                    </IconButton>                
                    
                    <IconButton 
                        onClick={()=>{
                            if(!selfStream){ // no video track no mic track
                                shareDesktop();
                            }
                            else{
                                const hasVideo = selfStream.getVideoTracks().length !==0;

                                if(hasVideo){
                                    toggleStreamTrack(selfStream,'video',!desktopIsSharing);
                                    setDesktopIsSharing(!desktopIsSharing)
                                }
                                else{
                                    shareDesktop();
                                }
                            }
                        }}
                        aria-label="Share Desktop" 
                        className={!desktopIsSharing ? "redBackground" : ""}
                    >
                        {desktopIsSharing ? <DesktopIcon /> : <DesktopDesableIcon/>}
                    </IconButton>                    
                    
                    <IconButton onClick={shareWhiteboard}>
                        <PenIcon />
                    </IconButton>
                    
                    <IconButton onClick={fastplay} >
                        <FastForwardIcon />
                    </IconButton>

                    {
                        self.isAdmin &&
                        <ClickAwayListener onClickAway={()=>setShowMore(false)}>
                            <div className="moreContainer">
                                <IconButton onClick={()=>{setShowMore(last=>!last)}}>
                                    <MoreIcon />
                                </IconButton>
                                    <List className={["moreList",showMore ? "show" : ""].join(" ")} >
                                        <ListItem button className="listItem" onClick={exportChatMessages}> Export Room Chats </ListItem>
                                        <ListItem button className="listItem" onClick={exportUsersActivity}>Export Users Activity</ListItem>
                                    </List>
                            </div>
                        </ClickAwayListener>
                    }

                    <IconButton aria-label="hangup" className="redBackground"  >
                        <HangupIcon />
                    </IconButton>
                </div>

                <div className="items right">
                    {
                        self.isAdmin &&
                        (<IconButton onClick={clearChat} >
                            <ClearIcon />
                        </IconButton>)
                    }
                    <IconButton aria-label="open chats" onClick={()=>{setShowChat(last=>!last)}} >
                        <ChatIcon  />
                    </IconButton>
                </div>

                {/* <IconButton onClick={()=>{props.setDarkTheme(!props.darkTheme)}} aria-label="theme">
                    { props.darkTheme ? <SunIcon/> : <MoonIcon /> } 
                </IconButton>                */}
            </Paper>

        </Paper>
    )
}
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

    //

// const stopCapture=(vidElem)=>{
//     let tracks = vidElem.srcObject.getTracks();
//     tracks.forEach(track => track.stop());
//     vidElem.srcObject = null;
// }

