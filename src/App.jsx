import React,{useState} from 'react';
import {BrowserRouter,Route} from "react-router-dom";
import { createTheme, MuiThemeProvider } from "@material-ui/core";
import Room from "./components/Room/Room";
import {RecoilRoot} from "recoil";
import { SnackbarProvider } from 'notistack';
import "./App.scss";

function App() {
    const [darkTheme,setDarkTheme] = useState(true);
    const theme = createTheme({
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
                    background:darkTheme? "#262829":null,
                    "box-shadow":"0 0px 15px 0 rgba(0,0,0,.08)"
                },
            },
        },
    }); 
    return (
    <MuiThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={3}>
            <RecoilRoot>
                <BrowserRouter>
                    <Route exact path="/" render={()=><Room setDarkTheme={setDarkTheme} darkTheme={darkTheme}/>} />
                </BrowserRouter>
            </RecoilRoot>
        </SnackbarProvider>
    </MuiThemeProvider>
    )
}

export default App;