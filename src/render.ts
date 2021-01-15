import {RenderingOptions} from "./types";
import {MAX_PROXIMITY_DISTANCE} from "./Simulation";

const SCALE = 15;
const GRID_GUTTER = 3;

export type Point = [number, number]

export interface Marker {
    label: string
    position: Point
}

export interface Obstacle {
    radius: number
    position: Point
}

export interface Rover {
    width: number
    height: number
    angle: number
    position: Point
}

function drawRover(context: CanvasRenderingContext2D, {width, height}: Rover, color: string){
    context.save();
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = 0.1;
    context.rect(-width / 2, -height / 2, width, height);
    context.stroke();
    context.restore();
}

function drawPath(context: CanvasRenderingContext2D, {position, angle}: Rover, trace: Array<Point>, color: string) {
    if(trace.length < 1) return;

    const [baseX, baseY] = position;

    context.save();

    context.strokeStyle = color;
    context.lineWidth = 0.1;
    context.rotate(angle);  // Rotate to the box body frame

    context.beginPath();
    context.moveTo(0, 0);

    for (let [x, y] of trace) {
        context.lineTo(baseX - x, y - baseY);
    }
    context.stroke();

    context.restore();
}


function drawMarkers(context: CanvasRenderingContext2D, {position, angle}: Rover, markers: Array<Marker>, radius: number, width: number, height: number, color: string) {
    if(markers.length < 1) return;

    const [baseX, baseY] = position;

    context.save();
    context.translate(width / 2, height / 2);  // Translate to the center
    context.scale(SCALE, SCALE);       // Zoom in and flip y axis
    context.rotate(-angle);

    context.font = "2px sans-serif";
    context.fillStyle = color;
    context.textAlign = "center";

    for(let marker of markers) {
        const {
            position = [0, 0],
            label =  'X'
        } = marker;

        const [x,y] = position;


        const deltaX = baseX - x;
        const deltaY = baseY - y;

        const theta = Math.atan2(deltaX, deltaY);
        const distance = Math.hypot(deltaX, deltaY);

        const maxDistance = (radius - 15) / SCALE;

        context.save();

        context.rotate(-theta);
        context.translate(0, Math.min(distance, maxDistance));
        context.rotate(theta);
        context.rotate(angle);

        if (distance < maxDistance) {
            const linearAlpha = Math.max(0, maxDistance - distance) / maxDistance
            context.globalAlpha = Math.min(linearAlpha * 8, 1);
            context.fillText(label, 0, - 1);
            context.globalAlpha = 1
        }

        context.beginPath();
        context.arc(0,0, .25, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    context.restore();
}

function drawObstacles(context: CanvasRenderingContext2D, {position, angle}: Rover, obstacles: Obstacle[]) {
    const [baseX, baseY] = position;

    context.save()

    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.scale(SCALE, SCALE);
    context.rotate(-angle);
    context.fillStyle = 'rgba(255, 0, 0, 0.2)';
    context.strokeStyle = 'rgba(255, 0, 0, 1)';
    context.lineWidth = 0.1;

    for (const obstacle of obstacles) {
        const { position, radius } = obstacle;
        const [x, y] = position;

        context.save();
        context.translate(baseX - x, baseY - y)
        context.beginPath();
        context.arc(0,0, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
    }

    context.restore()
}

function drawProximityValues(context: CanvasRenderingContext2D, proximityValues: number[]) {
    context.save()
    context.translate(context.canvas.width / 2, context.canvas.height / 2);

    for (let i = 0; i < proximityValues.length; i++) {
        const distance = proximityValues[i];

        const directionAngleInRadiant = ((Math.PI * 2) / proximityValues.length) * i;

        context.save();
        context.rotate(directionAngleInRadiant);
        context.translate(0, -distance * SCALE);

        if (Math.floor(distance + 0.001) === MAX_PROXIMITY_DISTANCE) {
            context.fillStyle = 'darkorange';
            context.fillRect(-0.5, -0.5, 1, 1);
        } else {
            context.fillStyle = 'orange';
            context.fillRect(-1, -1, 2, 2);
        }

        context.restore();
    }

    context.restore()
}

function drawCompass(context: CanvasRenderingContext2D, {angle}: Rover, radius: number, color: string) {
    context.save();
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(-angle);

    const fontSize = 16;
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;

    const directions: Array<{label: string, offset: [x: number, y: number]}> = [
        {label: 'N', offset: [0, -radius + fontSize]},
        {label: 'O', offset: [radius - fontSize, 0]},
        {label: 'S', offset: [0, radius - fontSize]},
        {label: 'W', offset: [-radius + fontSize, 0]},
    ]

    for (const direction of directions) {
        context.save()
        context.translate(...direction.offset)
        context.rotate(angle)
        context.fillText(direction.label, 0, 0);
        context.restore()
    }

    context.restore();
}

function drawGrid(context: CanvasRenderingContext2D, {position, angle}: Rover, rasterSize : number, color: string) {
    const x = position[0];
    const y = 0 - position[1];

    context.save();

    context.rotate(angle);  // Rotate to the box body frame

    context.lineWidth = 0.025;
    context.strokeStyle = color;

    const xOffset = x % GRID_GUTTER;
    const yOffset = y % GRID_GUTTER;

    const gridDim = GRID_GUTTER * rasterSize;

    context.beginPath();
    for (let i = -gridDim / 2; i <= gridDim / 2; i += GRID_GUTTER) {
        context.moveTo(xOffset + i, yOffset - gridDim / 2);
        context.lineTo(xOffset + i, yOffset + gridDim / 2);
    }

    for (let i = -gridDim / 2; i <= gridDim / 2; i += GRID_GUTTER) {
        context.moveTo(xOffset - gridDim / 2, yOffset + i);
        context.lineTo(xOffset + gridDim / 2, yOffset + i);
    }

    context.stroke();
    context.restore();
}

export default function render(
    context: CanvasRenderingContext2D,
    rover: Rover,
    trace: Array<Point>,
    markers: Array<Marker>,
    obstacles: Array<Obstacle>,
    proximityValues: Array<number>,
    options: RenderingOptions,
) {

    const {
        height = 500,
        width = 500,
        showGrid = true,
        showTrace = true,
        showCompass = true,
        colorTrace = 'blue',
        colorRover = 'red',
        colorMarker = 'goldenrod',
        colorGrid = 'lightgreen',
        colorCompass = 'lime',
    } = options;

    // Clear the canvas
    context.fillStyle = "black";
    context.fillRect(0, 0, width, height);
    //ctx.clearRect(0, 0, w, h);

    // Transform the canvas
    // Note that we need to flip the y axis since Canvas pixel coordinates
    // goes from top to bottom, while physics does the opposite.
    context.save();
    context.translate(width / 2, height / 2);  // Translate to the center

    context.beginPath();

    context.lineWidth = 0.5;
    context.strokeStyle = colorGrid;

    const radius = Math.min(width, height) / 2;

    context.arc(0, 0, radius - 1, 0, Math.PI * 2, true);
    context.stroke();

    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.clip();

    context.scale(SCALE, -SCALE);       // Zoom in and flip y axis

    // Draw
    if(showGrid){
        drawGrid(context, rover, Math.ceil(width / SCALE / GRID_GUTTER * 1.2), colorGrid);
    }
    if(showTrace) {
        drawPath(context, rover, trace, colorTrace);
    }

    drawRover(context, rover, colorRover);

    // Restore transform
    context.restore();
    drawObstacles(context, rover, obstacles);
    drawProximityValues(context, proximityValues);

    if (showCompass) {
        drawCompass(context, rover, radius, colorCompass);
    }

    drawMarkers(context, rover, markers, radius, width, height, colorMarker);
}
