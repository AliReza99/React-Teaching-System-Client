import React,{useState,useEffect,useRef,memo} from 'react';
import {makeStyles} from "@material-ui/core/styles";
import "./Drawer.scss";
import {useRecoilValue} from "recoil";
import {
    Divider,
    InputAdornment,
    ListSubheader,
    ListItemText,
    Typography,
    Paper,
    List,
    ListItem,
    IconButton,
    InputBase,
    Button
} from "@material-ui/core";
import {
    ReplyRounded as ReplyIcon,
    CheckRounded as TickIcon,
    SendRounded as SendIcon,
    Close as CloseIcon,
} from "@material-ui/icons";

import {socketState,usersState,selfState} from "../../Atoms/Atoms";
import ChatListItem from "../ChatListItem/ChatListItem";

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

const Drawer= memo(({showChat,setShowChat})=> {
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
    },[]);

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

export default Drawer;
