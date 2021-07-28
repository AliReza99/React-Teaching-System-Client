import React,{useState,memo} from 'react';
import Rating from '@material-ui/lab/Rating';
import "./ChatListItem.scss";
import {
    ListItemSecondaryAction,
    ListItem,
    ListItemText,
    Typography,
} from "@material-ui/core";

const ChatListItem = memo(({id,role,onClick,text,date,sender,hardness,repliedText,isAdmin,ratingOnChange,rate}) => {
    let isButton= false;
    const classes=[];
    let primaryText;
    let secondaryText = "";
    if(role==="question"){
        isButton= true;
        classes.push("question");
        primaryText=`Question `;
        secondaryText = `(Hardness: ${hardness})`;
    }
    else if(role==="answer"){
        classes.push("answer");
        primaryText=`${sender} `;
        secondaryText = `(Replied to: ${repliedText})`;
    }
    else{
        primaryText=sender;
    }
    const [value,setValue]=useState(rate);
    
    return (
        <ListItem 
            button={isButton} 
            onClick={onClick}
            className="listItem"
        >
            <ListItemText 
                className={classes.join(" ")}
                primary={<Typography component="div">{primaryText} <span className="caption">{secondaryText}</span> </Typography>}
                secondary={
                    <>
                        <Typography component="span" style={{display:"block"}} variant={"body2"} noWrap color="textSecondary" >
                            {text}
                        </Typography>
                        {
                            isAdmin && role==="answer" &&
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
                            !isAdmin && role==="answer" &&
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
                    {`${date.getHours()<10 ? "0" : ""}${date.getHours() }:${date.getMinutes()<10 ? "0" : ""}${date.getMinutes()}`}

                </div>
            </ListItemSecondaryAction>
        </ListItem>
    );
})

export default ChatListItem;
