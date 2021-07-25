export const setCanvasColors=(myCanvas,color)=>{
    const ctx= myCanvas.getContext("2d");
    ctx.strokeStyle=color;
    ctx.fillStyle=color;

}
export const clearCanvas=(myCanvas)=>{
    const ctx=myCanvas.getContext("2d");
    const prevColor=ctx.fillStyle;
    ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, myCanvas.width, myCanvas.height);
    ctx.fillStyle=prevColor;
    
}

export const freehandDraw=(myCanvas)=>{
    const ctx = myCanvas.getContext("2d");
    let isDrawing = false;
    let x = 0;
    let y = 0;

    const drawLine=(ctx, x1, y1, x2, y2) =>{
        ctx.beginPath();
        // ctx.strokeStyle = '#f00';
        ctx.lineWidth = 3;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
    }

    myCanvas.onmousedown= (e) => {
        x = e.offsetX;
        y = e.offsetY;
        isDrawing = true;
    }
    
    myCanvas.onmousemove= (e) => {
        if (isDrawing === true) {
            drawLine(ctx, x, y, e.offsetX, e.offsetY);
            x = e.offsetX;
            y = e.offsetY;
        }
    }
    
    myCanvas.onmouseup = (e) => {
        if (isDrawing === true) {
            drawLine(ctx, x, y, e.offsetX, e.offsetY);
            x = 0;
            y = 0;
            isDrawing = false;
        }
    }
}

export const drawRect=(myCanvas)=>{
    const ctx=myCanvas.getContext("2d");
    let x=0,y=0;

    myCanvas.onmousedown=(e)=>{
        x=e.offsetX;
        y=e.offsetY;
    }

    myCanvas.onmouseup=(e)=>{
        let width= e.offsetX - x;
        let height= e.offsetY - y;
        ctx.beginPath();
        // ctx.strokeStyle = "#f00";
        ctx.rect(x, y, width, height);
        ctx.stroke();
    }
}

export const drawLine=(myCanvas)=>{
    const ctx=myCanvas.getContext("2d");
    let x1=0,y1=0;

    myCanvas.onmousedown=(e)=>{
        x1=e.offsetX;
        y1=e.offsetY;
    }
    myCanvas.onmouseup=(e)=>{
        let x2=e.offsetX;
        let y2=e.offsetY;
        ctx.beginPath();
        ctx.lineWidth = '3';
        // ctx.strokeStyle = '#f00'; // color of the line
        ctx.moveTo(x1,y1); // begins a new sub-path based on the given x and y values.
        ctx.lineTo(x2, y2); // used to create a pointer based on x and y  
        ctx.stroke();
    }

}

export const drawEllipse=(ctx,x1, y1, x2, y2)=> {
    let radiusX = (x2 - x1) * 0.5,   /// radius for x
        radiusY = (y2 - y1) * 0.5,   /// radius for y
        centerX = x1 + radiusX,      /// calc center
        centerY = y1 + radiusY,
        step = 0.01,                 /// resolution of ellipse
        a = step,                    /// counter
        pi2 = Math.PI * 2 - step;    /// end angle
    
    ctx.beginPath();

    /// set start point at angle 0
    ctx.moveTo(centerX + radiusX * Math.cos(0),
               centerY + radiusY * Math.sin(0));

    /// create the ellipse    
    for(; a < pi2; a += step) {
        ctx.lineTo(centerX + radiusX * Math.cos(a), centerY + radiusY * Math.sin(a));
    }
    
    ctx.closePath();
    ctx.stroke();
}

export const drawCircle=(myCanvas)=>{
    const ctx=myCanvas.getContext("2d");
    let x1;
    let y1;

    myCanvas.onmouseup = (e)=> {
        /// get corrected mouse position and store as first point
        let rect = myCanvas.getBoundingClientRect();
        
        const x2 = e.clientX - rect.left
        const y2 = e.clientY - rect.top;
        drawEllipse(ctx,x1, y1, x2, y2);
    }
    
    myCanvas.onmousedown = (e)=> {
        let rect = myCanvas.getBoundingClientRect();
        x1 = e.clientX - rect.left;
        y1 = e.clientY - rect.top;
    }
}

export const drawText=(myCanvas)=>{
    const ctx = myCanvas.getContext("2d");
    let x = 0;
    let y = 0;

    myCanvas.onclick=(e)=>{
        x = e.offsetX;
        y = e.offsetY;
        const text =prompt('Enter Text');
        // ctx.fillStyle = "#f00";
        ctx.font = "20px Arial";
        ctx.fillText(text, x, y);
    }
}