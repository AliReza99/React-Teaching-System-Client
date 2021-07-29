import React,{memo,useRef,useState,useEffect} from 'react';
import { BlockPicker } from 'react-color';
import {useRecoilValue} from "recoil";
import "./Whiteboard.scss";
import {socketState} from "../../Atoms/Atoms";
import {
    Tooltip,
    Button,
    IconButton,
    ClickAwayListener,
} from "@material-ui/core";

import {
    Gesture as GestureIcon,
    ShowChartTwoTone as LineIcon,
    Crop32 as SquareIcon,
    FiberManualRecordOutlined as CircleIcon,
    TextFields as TextIcon,
    InsertPhoto as ImageIcon,
    ColorLens as ColorIcon,
    PictureAsPdfRounded as PDFIcon,
    NavigateNextRounded as NextArrow,

} from "@material-ui/icons";
import {
    drawText,
    drawCircle,
    drawLine,
    drawRect,
    freehandDraw,
    clearCanvas,
    setCanvasColors
} from "../../scripts/canvasDraw";

const colorsArr=["#000000","#E53935","#CFD8DC","#8E24AA","#303F9F","#0097A7","#FFEB3B","#76FF03","#4FC3F7","#CE93D8"]; // colors for canvas draw
const removeEvents=(element)=>{
    element.onmousedown=null;
    element.onmousemove=null
    element.onmouseup=null;
    element.onclick=null;
}

const isFileImage = (file)=> {
    return file && file['type'].split('/')[0] === 'image';
}

const Whiteboard = memo(({isSharing}) => {
    const [selectedCanvasButton,setSelectedCanvasButton] = useState(4);
    const [showColorPicker,setShowColorPicker]=useState(false);
    const [pdf,setPdf]=useState(null);
    const [pdfTotalPages,setPdfTotalPages] = useState(0);
    const [pageNum,setPageNum] = useState(null);
    const [pickedColor,setPickedColor]= useState(colorsArr[0]);
    
    const whiteboardRef=useRef(null);
    const fileInputRef=useRef(null);
    const PdfInputRef= useRef(false);
    const intervalID= useRef(null);
    const canvasContainerRef= useRef(null);
    const rootRef= useRef(null);

    const socket = useRecoilValue(socketState);


    const resizeCanvas=(width=600,height=750)=>{
        whiteboardRef.current.width= width;
        whiteboardRef.current.height= height;
    }

    const handleImageInputChange=()=>{
        const file = fileInputRef.current.files[0];
        if(!isFileImage(file)){
            console.log('selected file is not image format');
            return;
        }
        
        setPdf(null);
        setPdfTotalPages(0);
        setPageNum(null);

        
        resizeCanvas();

        const ctx = whiteboardRef.current.getContext("2d");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload=(e)=>{
            if(e.target.readyState === FileReader.DONE){
                const img = new Image();
                img.src = e.target.result;

                const imgWidth = whiteboardRef.current.width;
                const imgHeight = whiteboardRef.current.height;
                
                img.onload=()=>{
                    // const hRatio = imgWidth / img.width;
                    // const vRatio = imgWidth / img.height;
                    // const ratio  = Math.min ( hRatio, vRatio );

                    // ctx.drawImage(img, 0,0, img.width, img.height, 0,0,img.width*ratio, img.height*ratio);
                    ctx.drawImage(img,0,0,imgWidth,imgHeight);
                }
            }
        }
    }
    const handlePdfChange =()=>{
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        // pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
        if(!pdfjsLib){
            console.log('pdfjsLib is not supported');
            return
        }

        const file=PdfInputRef.current.files[0];
        if(file.type !== "application/pdf"){
            console.error(file.name, "is not a pdf file.")
            return;
        }
        const fileReader = new FileReader(); 

        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);

            pdfjsLib.getDocument(typedarray).promise.then(pdfDocument => {
                setPdf(pdfDocument)
                setPdfTotalPages(pdfDocument.numPages);
                setPageNum(1);
            });
            
            

        };
        fileReader.readAsArrayBuffer(file);
    }
    const nextPage=()=>{
        if(pageNum < pdfTotalPages){
            setPageNum(pageNum+1);
        }
    }
    const prevPage=()=>{
        if(pageNum > 1){
            setPageNum(pageNum - 1);
        }
    }

    useEffect(()=>{
        setCanvasColors(whiteboardRef.current,pickedColor.hex);
    },[pickedColor]);

    useEffect(()=>{
        if(pdf && pageNum){
            pdf.getPage(pageNum).then((page)=> {
                let viewport = page.getViewport({scale:1});
                
                // const width=560;
                // const scale = width / viewport.width;
                // viewport = page.getViewport({scale:scale});


                whiteboardRef.current.height = viewport.height;
                whiteboardRef.current.width = viewport.width;

                const renderContext = {
                    canvasContext: whiteboardRef.current.getContext("2d"),
                    viewport: viewport
                    };
                page.render(renderContext);
            })
        }
    },[pageNum,pdf]);

    useEffect(()=>{
        if(isSharing){
            clearCanvas(whiteboardRef.current);
            freehandDraw(whiteboardRef.current); //set freehand event as default draw method    
    
            
            const quality = .5;
            intervalID.current = window.setInterval(()=>{
                const base64ImageData = whiteboardRef.current.toDataURL("image/png",quality);
                socket.emit("whiteboard-data",{base64ImageData:base64ImageData})
            },1000);
        }
        else{
            if(intervalID.current){
                window.clearInterval(intervalID.current);
            }
        }
    },[isSharing]);
    useEffect(()=>{
        // whiteboardRef.current.width=canvasContainerRef.current.width;
        // whiteboardRef.current.height=canvasContainerRef.current.height;
        resizeCanvas();
        clearCanvas(whiteboardRef.current);
        
        return ()=>{
            window.clearInterval(intervalID.current);
        }
    },[])
    
    return (
    <div className="whiteboardContainer" ref={rootRef}>
        <div 
            // style={{display:"none"}} 
            className="canvasContainer" 
            ref={canvasContainerRef}
        >

            <canvas 
                ref={whiteboardRef} 
                // width="800" 
                // height="700"  
            ></canvas>
        </div>
        
        <div className="buttonsContainer">
            <Tooltip title="Add Image" arrow>
                <IconButton className="button" component="label">
                    <ImageIcon />
                    <input type="file" onChange={handleImageInputChange} ref={fileInputRef} hidden/>
                </IconButton>
            </Tooltip>                           

            
            <Tooltip title="Add PDF" arrow>
                <IconButton className="button" component="label">
                    <PDFIcon />
                    <input type="file" onChange={handlePdfChange} ref={PdfInputRef} hidden/>
                </IconButton>
            </Tooltip>

            {
                pdf &&
                (<>
                    <IconButton className="button" onClick={prevPage} disabled={pageNum === 1} >
                        <NextArrow style={{transform:"rotate(180deg)"}} />
                    </IconButton>

                    <IconButton className="button" onClick={nextPage} disabled={pageNum === pdfTotalPages}>
                        <NextArrow />
                    </IconButton>
                </>)
            }
            <Tooltip title="Line" arrow>
                <IconButton className={[selectedCanvasButton===0 ? "selected" : "","button"].join(" ")} onClick={()=>{setSelectedCanvasButton(0);removeEvents(whiteboardRef.current);drawLine(whiteboardRef.current); }}>
                    <LineIcon />
                </IconButton>     
            </Tooltip>

                                
            <Tooltip title="Square" arrow>
                <IconButton className={[selectedCanvasButton===1 ? "selected" : "","button"].join(" ")} onClick={()=>{setSelectedCanvasButton(1);removeEvents(whiteboardRef.current);drawRect(whiteboardRef.current); }}>
                    <SquareIcon />
                </IconButton>                            
            </Tooltip>
            
            <Tooltip title="Circle" arrow>
                <IconButton className={[selectedCanvasButton===2 ? "selected" : "","button"].join(" ")} onClick={()=>{setSelectedCanvasButton(2);removeEvents(whiteboardRef.current);drawCircle(whiteboardRef.current); }}>
                    <CircleIcon />
                </IconButton>
            </Tooltip>

            <Tooltip title="Text" arrow>
                <IconButton className={[selectedCanvasButton===3 ? "selected" : "","button"].join(" ")} onClick={()=>{setSelectedCanvasButton(3);removeEvents(whiteboardRef.current);drawText(whiteboardRef.current); }}>
                    <TextIcon />
                </IconButton>
            </Tooltip>
            
            <Tooltip title="Draw" arrow>
                <IconButton className={[selectedCanvasButton===4 ? "selected" : "","button"].join(" ")} onClick={()=>{setSelectedCanvasButton(4);removeEvents(whiteboardRef.current);freehandDraw(whiteboardRef.current); }}>
                    <GestureIcon />
                </IconButton>                            
            </Tooltip>
            <Button className="button" onClick={()=>{clearCanvas(whiteboardRef.current)}}>
                Clear
            </Button>
            <ClickAwayListener onClickAway={()=>{setShowColorPicker(false)}} >
                <div className="colorPickerContainer" >
                    <IconButton className="button" onClick={()=>{setShowColorPicker(val=>!val)}}>
                        <ColorIcon/>
                    </IconButton>
                    <div className={["colorPickerBlockContainer",showColorPicker ? "show" : ""].join(" ")} >
                        <BlockPicker color={pickedColor} width={170} onChangeComplete={setPickedColor} colors={colorsArr}/>
                    </div>
                </div>
            </ClickAwayListener>
        </div>
    </div>
    )
})

export default Whiteboard;
