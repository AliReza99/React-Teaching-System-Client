import React,{useState} from 'react';
import {BrowserRouter,Route} from "react-router-dom";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core";

// import Room from "./components/Room/Room";
// import WebRTC from "./components/WebRTC/WebRTC";
import V2 from "./components/v2/v2";
import "./App.scss";




function App() {
    const [darkTheme,setDarkTheme] = useState(true);
    const theme = createMuiTheme({
        props: {
            MuiButtonBase: {
                disableRipple: true
            }
        },
        palette: {
            type:darkTheme? "dark" :"light",
            primary: {
                // light: will be calculated from palette.primary.main,
                main: darkTheme ? "#757575":'#01579B',
                // dark: will be calculated from palette.primary.main,
                // contrastText: will be calculated to contrast with palette.primary.main
            },
            secondary: {
                light: '#0066ff',
                main: '#0044ff',
                // dark: will be calculated from palette.secondary.main,
                contrastText: '#ffcc00',
            },
        },
        shape: {
            borderRadius: 0,
        },
        overrides: {
            MuiPaper: {
                elevation1: {
                    background:darkTheme? "#21242b":null,
                    "box-shadow":"0 0px 15px 0 rgba(0,0,0,.08)"
                },
            },
        },
    }); 
    return (
    <MuiThemeProvider theme={theme}>
        <BrowserRouter>
            {/* <Route exact path="/" component={()=><Room setDarkTheme={setDarkTheme} darkTheme={darkTheme}/>} /> */}
            {/* <Route exact path="/webrtc" component={WebRTC} /> */}
            <Route exact path="/v2" component={V2} />
        </BrowserRouter>
    </MuiThemeProvider>
    )
}

export default App;