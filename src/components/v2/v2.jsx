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

const V2 = () => {    
    const classes = useStyles(); 
    const [username,setUsername] = useState("");
    const [room,setRoom] = useState("room1");
    const [streams,setStreams]= useState([]);
    const selfVidRef=useRef(null);
    const socket=useRef(null);
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
            
    const addStreams=(e,target)=>{
        const newstream={
            stream:e.streams[0],
            target:target
        }
        setStreams((last)=>{
            const newVal=last.filter(val=>val.stream.id !==newstream.stream.id);
            console.log('streams:' , newVal);
            return [...newVal,newstream];
        });
    }

    const handleICECandidateEvent=(e,pc)=>{
        if(e.candidate){
            socket.current.emit("ice-candidate", {
                target:pc.target,
                candidate:e.candidate
            });
        }
        else{
            console.log('peer connected');
        }
    }
    
    useEffect(()=>{
        socket.current=io(SOCKET_ENDPOINT);
        
        const connections=[];
        socket.current.on('connect',()=>{
            console.log('socket connection established');
        })
        socket.current.on('new-user-joined',async(userID)=>{
            //start of peer A
            // console.log(`user ${userID} joined room`);
            const pc=new RTCPeerConnection();
            pc.target=userID;
            connections[userID]=pc;
            const localStream= await captureWebcam();

            selfVidRef.current.srcObject=localStream;
            
            localStream.getTracks().forEach((track)=>{
                pc.addTrack(track,localStream);
            })
            pc.onicecandidate=(e)=>{handleICECandidateEvent(e,pc)};            
            pc.ontrack=(e)=>{addStreams(e,userID)};
            // pc.onnegotiationneeded = () => handleNegotiationNeededEvent(pc);
            
            
            const offer=await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.current.emit('offer',{
                offer:offer,
                target:userID
            });
            
        })
        
        socket.current.on('recieve-offer',async({offer,target})=>{
            //start of peer B
            const pc=new RTCPeerConnection();
            connections[target]=pc;
            pc.target=target;
            const localStream= await captureWebcam();

            selfVidRef.current.srcObject=localStream;
            
            
            localStream.getTracks().forEach((track)=>{
                pc.addTrack(track,localStream);
            })
            

            
            pc.onicecandidate=(e)=>{handleICECandidateEvent(e,pc);};
            pc.ontrack=(e)=>{addStreams(e,target)};

            // pc.onnegotiationneeded = () => handleNegotiationNeededEvent(pc);
            //////////////////////////////////////////////////////////
            
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            pc.setLocalDescription(answer);
            socket.current.emit('answer',{
                answer:answer,
                target:target
            })
            
        })
        
        socket.current.on('recieve-answer',async({answer,target})=>{
            await connections[target].setRemoteDescription(answer);
        })
        
        socket.current.on("ice-candidate", ({incoming,target})=> {
            const candidate = new RTCIceCandidate(incoming);
            connections[target].addIceCandidate(candidate)
    
        });
        
        socket.current.on("user-disconnected",userSocketID=>{
            // console.log(`user disconnected ${userSocketID}`);
            setStreams(lastVal=>{
                return lastVal.filter(elem=> elem.target !== userSocketID );
            })
        })
        
        return()=>{
            socket.current.close();
        }
    },[]);
    
    
    const handleSubmit=(e)=>{
        e.preventDefault();
        socket.current.emit('join-room',{
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
