import React,{createRef,useEffect,useState} from 'react';
import {io} from "socket.io-client";
import {Paper,InputBase,Button, TextField } from "@material-ui/core";
import {makeStyles} from "@material-ui/core/styles";

const SOCKET_ENDPOINT="http://192.168.1.37:5001";



const useStyles=makeStyles(theme=>{
    return {
        root:{
            height: '100vh',
        },
        input:{
            border:"1px rgba(255,255,255,0.5) solid",
            margin:"10px 0 0 0",
            padding:"5px"

        }
    }
})

// const server ={
//     iceServers: [
//         {
//             urls: "stun:stun.stunprotocol.org"
//         },
//         {
//             urls: 'turn:numb.viagenie.ca',
//             credential: 'muazkh',
//             username: 'webrtc@live.com'
//         },
//     ]
// }
const socket = io(SOCKET_ENDPOINT);
const pc= new RTCPeerConnection();//shouldn't be global

const WebRTC = () => {
    const vid1Ref=createRef(null);
    const vid2Ref=createRef(null);
    
    const classes = useStyles(); 
    const [username,setUsername] = useState("");
    const [room,setRoom] = useState("room1");

    const handleICECandidateEvent=(e)=>{//TODO:complete this
        console.log("target: " + pc.target,pc);
        if(e.candidate){
            socket.emit('ice-candidate',{
                candidate:e.candidate,
                // target:
            })
        }
    }
    
    useEffect(()=>{

        pc.ontrack = (ev) => {            
            const remoteStream=ev.streams[0];
            vid2Ref.current.srcObject=remoteStream;
            // console.log(remoteStream);
            // console.log(pc);
            
        }
        pc.onicecandidate=handleICECandidateEvent; //complete later
        
        
        socket.on('connect',()=>{
            console.log('socket connection established');
        })

        socket.on('error',({message})=>{
            console.log(`error recieved from server: ${message}`)
        })

        socket.on('user-connected',username=>{
            console.log(`user ${username} connected`);
        })

        socket.on('recieve-video-offer',async({offer,target})=>{
            pc.target=target;
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer);

            socket.emit('video-answer',{
                answer:answer,
                target:target
            });
            
        })

        socket.on('recieve-video-answer',async({answer,target})=>{
            pc.target=target;
            await pc.setRemoteDescription(answer);
            // console.log(pc);
        })
        
        return()=>{
            socket.close();
        }
    },[])
    
    const handleSubmit=(e)=>{
        e.preventDefault();
        socket.emit('join-room',{
            username:username,
            roomID:room
        })
    }
    
    const handleInput=(e,setter)=>{
        setter(e.target.value);
    }

    
    const captureWebcam=()=> {
        return new Promise((resolve,reject) => {
            navigator.mediaDevices.getUserMedia({video:true})
            .then(currentStream=>{
                resolve(currentStream);
            })
            .catch(() =>{
                reject();
            })
        });
    }
    
    const handleShareScreen=async()=>{
        const localStream= await captureWebcam()
        vid1Ref.current.srcObject=localStream;
        
        localStream.getTracks().forEach((track)=>{
            pc.addTrack(track,localStream);
        })
        const offer =await pc.createOffer();
        await pc.setLocalDescription(offer);



        
        socket.emit('video-offer',offer);
        
    }
    
    return (
        <Paper className={classes.root}>
            <form onSubmit={handleSubmit}>
                <InputBase value={username} onChange={(e)=>{handleInput(e,setUsername)}} className={classes.input} placeholder="username..."/><br />
                <InputBase value={room} onChange={(e)=>{handleInput(e,setRoom)}} className={classes.input} placeholder="room..."/>
                <Button type="submit">Submit</Button>
            </form>



            <video muted style={{width:"45%"}} autoPlay playsInline ref={vid1Ref}></video>
            <video muted style={{width:"45%"}} autoPlay playsInline ref={vid2Ref}></video>
            
            <Button onClick={handleShareScreen}>
                Share Screen
            </Button>
            
        </Paper>
    );
}

export default WebRTC;
