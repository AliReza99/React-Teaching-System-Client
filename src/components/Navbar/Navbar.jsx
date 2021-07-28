import React,{memo,useState,useEffect} from "react";
import {
    ClickAwayListener,
    List,
    ListItem,
    Paper,
    IconButton,
    Button
} from "@material-ui/core";
import {makeStyles} from "@material-ui/core/styles";

import {
    MicRounded as MicrophoneIcon,
    DesktopMacRounded as DesktopIcon,
    DesktopAccessDisabled as DesktopDesableIcon,
    MicOffRounded as MicrophoneDisableIcon,
    BorderColorRounded as PenIcon,
    CallEndRounded as HangupIcon,
    ChatRounded as ChatIcon,
    FastForwardRounded as FastForwardIcon,
    ClearAll as ClearIcon,
    MoreVert as MoreIcon,

} from "@material-ui/icons";

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

const Navbar=({shareWhiteboardClick,exportUsersActivity,exportChatMessages,toggleChats,clearChat,isAdmin,roomName,fastplayClick,shareMicrophoneOnClick,micIsSharing,shareDesktopOnClick,desktopIsSharing})=>{
    const [showMore,setShowMore] = useState(false);
    
    const classes=useStyle();
    
    return (
        <Paper
        className={classes.nav}
    >
        <div className="items">
            <Timer />
            | {roomName}
        </div>
        <div className="items center">
            <IconButton 
                onClick={shareMicrophoneOnClick}
                aria-label="Share Microphone"
                className={!micIsSharing ? "redBackground" : ""}
            >
                { micIsSharing ? <MicrophoneIcon /> : <MicrophoneDisableIcon/> }
            </IconButton>                
            
            <IconButton 
                onClick={shareDesktopOnClick}
                aria-label="Share Desktop" 
                className={!desktopIsSharing ? "redBackground" : ""}
            >
                {desktopIsSharing ? <DesktopIcon /> : <DesktopDesableIcon/>}
            </IconButton>                    
            
            <IconButton onClick={shareWhiteboardClick}>
                <PenIcon />
            </IconButton>
            
            <IconButton onClick={fastplayClick} >
                <FastForwardIcon />
            </IconButton>

            {
                isAdmin &&
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
                isAdmin &&
                (<IconButton onClick={clearChat} >
                    <ClearIcon />
                </IconButton>)
            }
            <IconButton aria-label="open chats" onClick={toggleChats} >
                <ChatIcon  />
            </IconButton>
        </div>

    </Paper>
    )
}
export default Navbar;