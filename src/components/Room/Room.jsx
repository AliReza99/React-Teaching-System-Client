import React,{useEffect,useState,useRef,useCallback} from 'react';
import "./Room.scss";
import Drawer from "../Drawer/Drawer";
import Whiteboard from "../Whiteboard/Whiteboard";
import Navbar from "../Navbar/Navbar";
// import { useSnackbar } from 'notistack';
import {
    Paper,
    InputBase,
    IconButton,
    Button,
} from "@material-ui/core";

import {
    Close as CloseIcon,
} from "@material-ui/icons";
import {
    useRecoilValue,
    useSetRecoilState,
    useRecoilState
} from "recoil";
import {
    socketState,
    usersState,
    selfState
} from "../../Atoms/Atoms";
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

export default function Room(props) {
    // States
    const [roomInput,setRoomInput] = useState("room1");
    const [usernameInput,setUsernameInput] = useState("");
    
    const [showLogin,setShowLogin] = useState(true); //////////////true
    const [isWhiteboardSharing,setIsWhiteboardSharing]=useState(false); //// false

    const [isSelfDesktopSharing,setIsSelfDesktopSharing]=useState(false);
    const [isSelfMicSharing,setIsMicSharing]=useState(false);
    

    const [streams,setStreams]= useState([]);
    const [selfStream,setSelfStream] = useState(null);
    
    const [isShowFastplay,setIsShowFastplay] = useState(false);
    const [fastplaySender,setFastplaySender] = useState("");

    const [wbSenderName,setWbSenderName]=useState("");
    const [isWhiteboardRecieving,setIsWhiteboardRecieving] = useState(false);
    const [roomName,setRoomName] = useState("");
    const [showChat,setShowChat] = useState(true);
    
    // Refs
    const isPrevWBrecieved=useRef(false);
    const connectionsRef=useRef({});
    const whiteboardImgRef= useRef(null);
    const fastplayImgRef= useRef(null);
    const whiteboardDataRef=useRef([]);
    const isFastplayPlaying= useRef(false);
    
    // Recoils
    const socket = useRecoilValue(socketState);
    const setUsers = useSetRecoilState(usersState);
    const [self,setSelf] = useRecoilState(selfState);

    // snackbar
    // const { enqueueSnackbar } = useSnackbar();

    
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
        
        setIsMicSharing(true);
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

        setIsSelfDesktopSharing(true);
    }



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
    const fastplayClick=()=>{
        if(isPrevWBrecieved.current){
            fastplayImgs();
        }
        else{
            requestPrevWhiteboardData();
        }
        
    }

    const handleLogin=(e)=>{
        e.preventDefault();
        socket.emit('join-room',{
            username:usernameInput,
            roomID:roomInput
        });
        setShowLogin(false);
    }

    const handleInput=(e,setter)=>{
        setter(e.target.value);
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

        socket.on('disconnect-whiteboard',()=>{
            setIsWhiteboardRecieving(false);
        })
        
        socket.on("full-whiteboard-data",(dataArr)=>{ //recieve previously shared WB data
            if(dataArr.length===0){
                return
            }
            whiteboardDataRef.current=dataArr;
            isPrevWBrecieved.current=true;
            fastplayImgs();
        });

        socket.on("whiteboard-data",(data)=>{
            let isPresenting=false;
            setIsWhiteboardSharing(lastVal=>{
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
                setWbSenderName(data.sender); // does is need to be there ?
            }
            else{
                console.log('currently just watchin');
                whiteboardImgRef.current.src=data.base64ImageData;
                setWbSenderName(data.sender); // will not rerender if sender doesn't changed
                setIsWhiteboardRecieving(true);
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
    

    const shareMicrophoneOnClick=()=>{
        if(!selfStream){ // no video track no mic track
            console.log('self stream was empty');
            shareMicrophone();
        }
        else{
            const hasAudio = selfStream.getAudioTracks().length !==0;

            if(hasAudio){
                console.log('has audio track so toggle audio')
                toggleStreamTrack(selfStream,'audio',!isSelfMicSharing);
                setIsMicSharing(!isSelfMicSharing)
            }
            else{
                shareMicrophone();
            }
        }
    }
    const shareDesktopOnClick=()=>{
        if(!selfStream){ // no video track no mic track
            shareDesktop();
        }
        else{
            const hasVideo = selfStream.getVideoTracks().length !==0;

            if(hasVideo){
                toggleStreamTrack(selfStream,'video',!isSelfDesktopSharing);
                setIsSelfDesktopSharing(!isSelfDesktopSharing)
            }
            else{
                shareDesktop();
            }
        }
        
    }

    const handleWhiteboardClick=()=>{
        if(isWhiteboardSharing){
            setIsWhiteboardSharing(false);
            socket.emit("disconnect-whiteboard");
        }
        else{
            setIsWhiteboardSharing(true);

        }
    }
    
    const toggleChats=()=>{
        setShowChat(last=>!last);
    }

    return (
        <Paper square className="container">
            <div className="main">
                <form onSubmit={handleLogin} className={["loginForm",showLogin ? "show" : ""].join(" ")}>
                    <InputBase value={usernameInput} onChange={(e)=>{handleInput(e,setUsernameInput)}} required  placeholder="username..."/><br />
                    <InputBase value={roomInput} onChange={(e)=>{handleInput(e,setRoomInput)}} required placeholder="room..."/>
                    <Button type="submit">Join</Button>
                </form>



                
                <div className={["streamsContainer",!showChat ? "expand" : ""].join(" ")} style={{gridTemplateColumns:`repeat(${Math.floor(Math.log( (selfStream ? 1 : 0)+streams.length ===1 ? 1 : (selfStream ? 1 : 0)+streams.length ) /Math.log(2))+1}, minmax(0, 1fr))`}}>

                    <div className={`fastplayContainer ${isShowFastplay ? "show" : "" }`}>
                        <div className="title"> Whiteboard Replay from: <span>{fastplaySender}</span> </div>
                        <IconButton className="closeIconContainer"  onClick={()=>{setIsShowFastplay(false)}} >
                            <CloseIcon fontSize="large"/>
                        </IconButton>
                        <div className="imageContainer">
                            <img alt="whiteboard" ref={fastplayImgRef}/>
                        </div>
                    </div>
                
                    
                    {/* <div className="vidContainer self whiteboardContainer" style={{display:isWhiteboardSharing? "flex" : "none"}}> */}
                    <div className="" style={{display:isWhiteboardSharing? "flex" : "none"}}>
                        <Whiteboard isSharing={isWhiteboardSharing}/>
                    </div>
                        
                    {
                        selfStream && ! isWhiteboardSharing &&
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
                    <div className={["whiteboardImgContainer",isWhiteboardRecieving ? "show" : ""].join(" ")}>
                        <div className="title">{wbSenderName}</div>
                        <div className="imageContainer">
                            <img alt="whiteboard" ref={whiteboardImgRef} />
                        </div>
                    </div>                    

                </div>
                
            </div>
            <Drawer showChat={showChat} setShowChat={setShowChat}/>
                        
            <Navbar 
                roomName={roomName} 
                isAdmin={self.isAdmin} 
                micIsSharing={isSelfMicSharing}
                desktopIsSharing={isSelfDesktopSharing} 

                exportUsersActivity={exportUsersActivity} 
                exportChatMessages={exportChatMessages} 
                toggleChats={toggleChats} 
                clearChat={clearChat} 
                
                fastplayClick={fastplayClick} 
                shareDesktopOnClick={shareDesktopOnClick} 
                shareMicrophoneOnClick={shareMicrophoneOnClick} 
                shareWhiteboardClick={handleWhiteboardClick}
            />
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

    // const shareWebcam = async()=>{
    //     const tempStream = await captureWebcam();
        
    //     for(const key in connectionsRef.current){
    //         tempStream.getTracks().forEach((track)=>{
    //             connectionsRef.current[key].addTrack(track,tempStream);
    //         });
    //     }
    //     setSelfStream(tempStream);
    // }

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