import {io} from "socket.io-client";
import {atom } from "recoil";
const SOCKET_ENDPOINT="http://localhost:5001"; //server endpoint


export const socketState = atom({
    key: 'socket', // unique ID (with respect to other atoms/selectors)
    default: io(SOCKET_ENDPOINT),
});

export const usersState=atom({
    key:"users",
    default:[]
});

export const selfState = atom({
    key:"self",
    default:{
        isAdmin:false,
        username:"",
        
    }
})