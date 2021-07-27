import React,{memo,useRef,useState,useEffect} from 'react';
import { BlockPicker } from 'react-color';
import {useRecoilValue} from "recoil";
import {socketState} from "../../Atoms/Atoms";
import {
    Tooltip,
    Button,
    ClickAwayListener,
} from "@material-ui/core";
import {
    drawText,
    drawCircle,
    drawLine,
    drawRect,
    freehandDraw,
    clearCanvas,
    setCanvasColors
} from "../../scripts/canvasDraw";
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

const Whiteboard = memo(({isCanvasSharing}) => {
    const whiteboardRef=useRef(null);
    const [selectedCanvasButton,setSelectedCanvasButton] = useState(4);
    const [showColorPicker,setShowColorPicker]=useState(false);
    const [pdf,setPdf]=useState(null);
    const [pdfTotalPages,setPdfTotalPages] = useState(0);
    const [pageNum,setPageNum] = useState(null);
    const [pickedColor,setPickedColor]= useState(colorsArr[0]);

    const fileInputRef=useRef(null);
    const PdfInputRef= useRef(false);
    const intervalID= useRef(null);

    const socket = useRecoilValue(socketState);




    const handleImageInputChange=()=>{
        const file = fileInputRef.current.files[0];
        if(!isFileImage(file)){
            console.log('selected file is not image format');
            return;
        }
        
        const ctx = whiteboardRef.current.getContext("2d");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload=(e)=>{
            if(e.target.readyState === FileReader.DONE){
                const img = new Image();
                img.src = e.target.result;
                img.onload=()=>{
                    ctx.drawImage(img,0,0,560,360);
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
        if(pdf){
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
        if(isCanvasSharing){
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
    },[isCanvasSharing]);
    
    return (
    <>
    <canvas width="560" height="360" className="vid" ref={whiteboardRef} ></canvas>
    <div className="buttonsContainer">
        <Tooltip title="Add Image" arrow>
            <Button component="label">
                <ImageIcon />
                <input type="file" onChange={handleImageInputChange} ref={fileInputRef} hidden/>
            </Button>
        </Tooltip>                           

        
        <Tooltip title="Add PDF" arrow>
            <Button component="label">
                <PDFIcon />
                <input type="file" onChange={handlePdfChange} ref={PdfInputRef} hidden/>
            </Button>
        </Tooltip>

        {
            pdf &&
            <>
                <Tooltip title="Previous Page" arrow>
                    <Button onClick={prevPage} disabled={pageNum === 1} >
                        <NextArrow style={{transform:"rotate(180deg)"}} />
                    </Button>
                </Tooltip>

                <Tooltip title="Next Page" arrow>
                    <Button onClick={nextPage} disabled={pageNum === pdfTotalPages}>
                        <NextArrow />
                    </Button>
                </Tooltip>
            </>
        }
        <Tooltip title="Line" arrow>
            <Button className={selectedCanvasButton===0 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(0);removeEvents(whiteboardRef.current);drawLine(whiteboardRef.current); }}>
                <LineIcon />
            </Button>     
        </Tooltip>

                            
        <Tooltip title="Square" arrow>
            <Button className={selectedCanvasButton===1 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(1);removeEvents(whiteboardRef.current);drawRect(whiteboardRef.current); }}>
                <SquareIcon />
            </Button>                            
        </Tooltip>
        
        <Tooltip title="Circle" arrow>
            <Button className={selectedCanvasButton===2 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(2);removeEvents(whiteboardRef.current);drawCircle(whiteboardRef.current); }}>
                <CircleIcon />
            </Button>
        </Tooltip>

        <Tooltip title="Text" arrow>
            <Button className={selectedCanvasButton===3 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(3);removeEvents(whiteboardRef.current);drawText(whiteboardRef.current); }}>
                <TextIcon />
            </Button>
        </Tooltip>
        
        <Tooltip title="Draw" arrow>
            <Button className={selectedCanvasButton===4 ? "selected" : ""} onClick={()=>{setSelectedCanvasButton(4);removeEvents(whiteboardRef.current);freehandDraw(whiteboardRef.current); }}>
                <GestureIcon />
            </Button>                            
        </Tooltip>
        <Button onClick={()=>{clearCanvas(whiteboardRef.current)}}>
            Clear
        </Button>
        <ClickAwayListener onClickAway={()=>{setShowColorPicker(false)}} >
            <div className="cp" >
                <Button onClick={()=>{setShowColorPicker(val=>!val)}}>
                    <ColorIcon/>
                </Button>
                    <div className={["colorPickerContainer",showColorPicker ? "show" : ""].join(" ")} >
                        <BlockPicker color={pickedColor} width={170} onChangeComplete={setPickedColor} colors={colorsArr}/>
                    </div>
            </div>
        </ClickAwayListener>
    </div>
    </>
    )
})

export default Whiteboard;
