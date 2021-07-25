import React,{useState} from 'react';
import Rating from '@material-ui/lab/Rating';
import {
    ListItemSecondaryAction,
    ListItem,
    ListItemText,
    Typography,
} from "@material-ui/core";

const ChatListItem = ({id,role,onClick,text,date,sender,hardness,repliedText,isAdmin,ratingOnChange,rate}) => {
    let isButton= false;
    const classes=[];
    let primaryText;
    if(role==="question"){
        isButton= true;
        classes.push("question");
        primaryText=`Question (Hardness: ${hardness})`;
    }
    else if(role==="answer"){
        classes.push("answer");
        primaryText=`${sender} (Replied to: ${repliedText})`;
    }
    else{
        primaryText=sender;
    }
    const [value,setValue]=useState(rate);
    
    
    return (
        <ListItem 
            button={isButton} 
            onClick={onClick}
        >
            <ListItemText 
                className={classes.join(" ")}
                primary={primaryText}
                secondary={
                    <>
                        <Typography component="span" style={{display:"block"}} variant={"body2"} noWrap color="textSecondary" >
                            {text}
                        </Typography>
                        {
                            role==="answer" && isAdmin &&
                            <Rating
                                className="rating"
                                name={`answer-rating${id}`}
                                value={value}
                                onChange={(e,newVal)=>{
                                    setValue(newVal);
                                    ratingOnChange(newVal);
                                }}
                                size="small"
                            />
                        }
                        {
                            role==="answer" && !isAdmin &&
                            <Rating
                                className="rating"
                                name={`answer-rating${id}`}
                                value={rate}
                                size="small"
                                readOnly
                            />
                        }
                    </>
                    
                }/>
            <ListItemSecondaryAction>
                <div className="status">
                    {date.getHours() + ":" + date.getMinutes()}
                </div>
            </ListItemSecondaryAction>
        </ListItem>
    );
}

export default ChatListItem;
