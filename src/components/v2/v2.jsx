import React,{useEffect,useState,useRef} from 'react';
import {io} from "socket.io-client";
import {Paper,InputBase,Button } from "@material-ui/core";
import {makeStyles} from "@material-ui/core/styles";

const SOCKET_ENDPOINT="http://localhost:5001";



const useStyles=makeStyles(theme=>{
    return {
        root:{
            height: '100vh',
        },
        input:{
            border:"1px rgba(255,0,255,0.5) solid",
            margin:"10px 0 0 0",
            padding:"5px"

        }
    }
});
const handleInput=(e,setter)=>{
    setter(e.target.value);
}
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

const V2 = () => {    
    const classes = useStyles(); 
    const [username,setUsername] = useState("");
    const [room,setRoom] = useState("room1");
    const [streams,setStreams]= useState([]);
    const selfVidRef=useRef(null);
    const socketRef=useRef(null);

    const handleNegotiationNeeded=async(pc)=> {
        console.log('handle negotiation needed fired');
        const offer=await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('new offer',pc.localDescription);
        socketRef.current.emit('offer',{
            offer:pc.localDescription,
            target:pc.target
        });
    }
    

    
    const addStreams=React.useCallback((e,target)=>{
        const newStream= new VidStream(e.streams[0],target);
        setStreams((last)=>{
            const newVal=last.filter(val=>val.stream.id !==newStream.stream.id);
            return [...newVal,newStream];
        });
    },[]);

    const handleICECandidateEvent=(e,pc)=>{
        if(e.candidate){
            socketRef.current.emit("ice-candidate", {
                target:pc.target,
                candidate:e.candidate
            });
        }
        else{
            console.log(`peer ${pc.target} connected`);
        }
    }
    
    useEffect(()=>{
        socketRef.current=io(SOCKET_ENDPOINT);
    },[])
    
    useEffect(()=>{ 
        const connections=[];
        
        socketRef.current.on('connect',()=>{
            console.log('socket connection established');
        })
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
            connections[target]=peer;
            peer.onicecandidate = (e)=>{handleICECandidateEvent(e,peer)};
            peer.ontrack = (e)=>{addStreams(e,target)};
            peer.onnegotiationneeded = () =>{handleNegotiationNeeded(peer)};
            peer.target=target;
    
            return peer;
        };
        socketRef.current.on('new-user-joined',async(userID)=>{
            //start of peer A
            const pc=createPeer(userID);
            const localStream= await captureWebcam();
            selfVidRef.current.srcObject=localStream;
            // const tracks=[];
            localStream.getTracks().forEach((track)=>{
                pc.addTrack(track,localStream);
            });
                        
            //at this point handleNegotiationNeeded will fire and offer will be send to peer
        })
        
        const toggleStreamTrack=(stream,type,enabled)=>{
            /* 
            toggle video or audio of stream ; also remote peers tracks will disable  
            usage: toggleStreamTrack(localStream,'video',true); 
            */
            stream.getTracks().forEach((track)=>{
                if(track.kind===type){
                    track.enabled=enabled
                }
            })
        }
        
        socketRef.current.on('offer',async({offer,target})=>{
            //start of peer B
            const sdp= new RTCSessionDescription(offer)
            const pc=createPeer(target);
            await pc.setRemoteDescription(sdp);

            const localStream= await captureWebcam();
            localStream.getTracks().forEach((track)=>{
                pc.addTrack(track,localStream);
            })
            
            selfVidRef.current.srcObject=localStream;
            
            
            
           
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit('answer',{
                answer:answer,
                target:target
            })
            
        })
        
        socketRef.current.on('answer',async({answer,target})=>{
            await connections[target].setRemoteDescription(new RTCSessionDescription(answer));
        })
        
        socketRef.current.on("ice-candidate", ({incoming,target})=> {
            const candidate = new RTCIceCandidate(incoming);
            connections[target].addIceCandidate(candidate);
        });
        
        socketRef.current.on("user-disconnected",userSocketID=>{
            // console.log(`user disconnected ${userSocketID}`);
            setStreams(lastVal=>{
                return lastVal.filter(elem=> elem.target !== userSocketID );
            })
        })
        
        return()=>{
            socketRef.current.close();
        }
    },[addStreams]);
    
    
    const handleSubmit=(e)=>{
        e.preventDefault();
        socketRef.current.emit('join-room',{
            username:username,
            roomID:room
        })
    }
    


    

    
    return (
        <Paper className={classes.root}>
            <form onSubmit={handleSubmit}>
                <InputBase value={username} onChange={(e)=>{handleInput(e,setUsername)}} className={classes.input} placeholder="username..."/><br />
                <InputBase value={room} onChange={(e)=>{handleInput(e,setRoom)}} className={classes.input} placeholder="room..."/>
                <Button type="submit">Join</Button>
            </form>

            <video style={{width:"45%"}} ref={selfVidRef} muted autoPlay playsInline></video>                        
            {
                streams.map(({stream})=>{
                    return (
                        <video key={stream.id} ref={elem=>{if(elem) return elem.srcObject=stream}} muted style={{width:"45%"}} autoPlay playsInline></video>                        
                    )
                })
            }

        </Paper>
    );
}

export default V2;
