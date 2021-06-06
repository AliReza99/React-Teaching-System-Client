import React,{createRef,useEffect,useState} from 'react';
// import 
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
})
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

const socket = io(SOCKET_ENDPOINT);
const connections=[];

const V2 = () => {
    const localVidRef=createRef(null);
    const remoteVidRef=createRef(null);
    const vidsContainer=createRef(null);
    
    const classes = useStyles(); 
    const [username,setUsername] = useState("");
    const [room,setRoom] = useState("room1");


    const handleICECandidateEvent=(target,e)=>{//TODO:complete this
        // console.log(connections[target]);
        if(e.candidate){
            socket.emit("ice-candidate", {
                target:target,
                candidate:e.candidate
            });
        }
        else{
            console.log('ice ended');
        }
    }
    
    // const handleNegotiationNeededEvent=async(pc)=> {
    //     console.log('handle negotiation needed fired');
    //     console.log('prev offer',pc.localDescription);
    //     const offer=await pc.createOffer();
    //     // console.log('new offer',offer);
    //     await pc.setLocalDescription(offer);
    //     console.log('new offer',pc.localDescription);
    //     socket.emit('offer',{
    //         offer:pc.localDescription,
    //         target:pc.target
    //     });
    // }
    
    useEffect(()=>{
        socket.on('connect',()=>{
            console.log('socket connection established');
        })
        socket.on('new-user-joined',async(userID)=>{
            //start of peer A
            console.log(`user ${userID} joined room`);
            const pc=new RTCPeerConnection();
            pc.target=userID;
            connections[userID]=pc;
            const localStream= await captureWebcam()
            localVidRef.current.srcObject=localStream;
            
            localStream.getTracks().forEach((track)=>{
                pc.addTrack(track,localStream);
            })

/////////////////////////////////////////////////////////
            pc.onicecandidate=(e)=>{handleICECandidateEvent(pc.target,e);}
            pc.ontrack=(e)=>{
                const remoteStream=e.streams[0];
                // console.log("B stream",remoteStream);
                remoteVidRef.current.srcObject=remoteStream;
                
            }
            // pc.onnegotiationneeded = () => handleNegotiationNeededEvent(pc);
            
            
            //////////////////////////////////////////////////////////
            // console.log(connections);
            const offer=await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer',{
                offer:offer,
                target:userID
            });
            
        })
        
        socket.on('recieve-offer',async({offer,target})=>{
            //start of peer B
            const pc=new RTCPeerConnection();
            connections[target]=pc;
            pc.target=target;
            // targ=target;
            const localStream= await captureWebcam()
            localVidRef.current.srcObject=localStream;
            
            localStream.getTracks().forEach((track)=>{
                pc.addTrack(track,localStream);
            })
            

            
            //////////////////////////////////////////////////////////
            pc.onicecandidate=(e)=>{handleICECandidateEvent(pc.target,e);};
            pc.ontrack=(e)=>{
                const remoteStream=e.streams[0];
                // console.log("A stream",remoteStream);
                remoteVidRef.current.srcObject=remoteStream;
            }
            // pc.onnegotiationneeded = () => handleNegotiationNeededEvent(pc);
            //////////////////////////////////////////////////////////
            
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            pc.setLocalDescription(answer);
            socket.emit('answer',{
                answer:answer,
                target:target
            })
            
        })
        
        socket.on('recieve-answer',async({answer,target})=>{
            await connections[target].setRemoteDescription(answer);
        })
        
        socket.on("ice-candidate", ({incoming,target})=> {
            const candidate = new RTCIceCandidate(incoming);
            connections[target].addIceCandidate(candidate)
    
        });
        
        return()=>{
            socket.close();
        }
    },[localVidRef,remoteVidRef])
    
    
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

    

    
    return (
        <Paper className={classes.root}>
            <form onSubmit={handleSubmit}>
                <InputBase value={username} onChange={(e)=>{handleInput(e,setUsername)}} className={classes.input} placeholder="username..."/><br />
                <InputBase value={room} onChange={(e)=>{handleInput(e,setRoom)}} className={classes.input} placeholder="room..."/>
                <Button type="submit">Submit</Button>
            </form>


            <div ref={vidsContainer}>
                <video muted style={{width:"45%"}} autoPlay playsInline ref={localVidRef}></video>
                <video muted style={{width:"45%"}} autoPlay playsInline ref={remoteVidRef}></video>

            </div>

        </Paper>
    );
}

export default V2;
