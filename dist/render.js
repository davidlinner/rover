"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Simulation_1 = require("./Simulation");
const SCALE = 15;
const GRID_GUTTER = 3;
function drawRover(context, { width, height }, color) {
    context.save();
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = 0.1;
    context.rect(-width / 2, -height / 2, width, height);
    context.stroke();
    context.restore();
}
function drawPath(context, { position, angle }, trace, color) {
    if (trace.length < 1)
        return;
    const [baseX, baseY] = position;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 0.1;
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, 0);
    for (let [x, y] of trace) {
        context.lineTo(baseX - x, y - baseY);
    }
    context.stroke();
    context.restore();
}
function drawMarkers(context, { position, angle }, markers, color) {
    if (markers.length < 1)
        return;
    const [baseX, baseY] = position;
    context.save();
    context.rotate(angle);
    context.scale(1, -1);
    context.font = "2px SansSerif";
    context.fillStyle = "purple";
    context.textAlign = "center";
    for (let marker of markers) {
        const { position = [0, 0], label = 'X' } = marker;
        const [x, y] = position;
        context.save();
        context.translate(baseX - x, baseY - y);
        context.rotate(angle);
        context.fillText(label, 0, -1);
        context.beginPath();
        context.arc(0, 0, .25, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
    context.restore();
}
function drawObstacles(context, { position, angle }, obstacles) {
    const [baseX, baseY] = position;
    context.save();
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
        context.translate(baseX - x, baseY - y);
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
    }
    context.restore();
}
function drawObstacleRays(context, proximityValues) {
    context.save();
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    for (let i = 0; i < proximityValues.length; i++) {
        const distance = proximityValues[i];
        const directionAngleInRadiant = ((Math.PI * 2) / proximityValues.length) * i;
        context.save();
        context.rotate(directionAngleInRadiant);
        context.translate(0, -distance * SCALE);
        if (Math.floor(distance + 0.001) === Simulation_1.MAX_PROXIMITY_DISTANCE) {
            context.fillStyle = 'darkorange';
            context.fillRect(-0.5, -0.5, 1, 1);
        }
        else {
            context.fillStyle = 'orange';
            context.fillRect(-1, -1, 2, 2);
        }
        context.restore();
    }
    context.restore();
}
function drawCompass(context, { angle }, radius, color) {
    context.save();
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(-angle);
    const fontSize = 16;
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    const directions = [
        { label: 'N', offset: [0, -radius + fontSize] },
        { label: 'O', offset: [radius - fontSize, 0] },
        { label: 'S', offset: [0, radius - fontSize] },
        { label: 'W', offset: [-radius + fontSize, 0] },
    ];
    for (const direction of directions) {
        context.save();
        context.translate(...direction.offset);
        context.rotate(angle);
        context.fillText(direction.label, 0, 0);
        context.restore();
    }
    context.restore();
}
function drawGrid(context, { position, angle }, rasterSize, color) {
    const x = position[0];
    const y = 0 - position[1];
    context.save();
    context.rotate(angle);
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
function render(context, rover, trace, markers, obstacles, proximityValues, options) {
    const { height = 500, width = 500, showGrid = true, showTrace = true, showCompass = true, colorTrace = 'blue', colorRover = 'red', colorMarker = 'purple', colorGrid = 'lightgreen', colorCompass = 'lime', } = options;
    context.fillStyle = "black";
    context.fillRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);
    context.beginPath();
    context.lineWidth = 0.5;
    context.strokeStyle = colorGrid;
    const radius = Math.min(width, height) / 2;
    context.arc(0, 0, radius - 1, 0, Math.PI * 2, true);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.clip();
    context.scale(SCALE, -SCALE);
    if (showGrid) {
        drawGrid(context, rover, Math.ceil(width / SCALE / GRID_GUTTER * 1.2), colorGrid);
    }
    if (showTrace) {
        drawPath(context, rover, trace, colorTrace);
    }
    drawMarkers(context, rover, markers, colorMarker);
    drawRover(context, rover, colorRover);
    context.restore();
    drawObstacles(context, rover, obstacles);
    drawObstacleRays(context, proximityValues);
    if (showCompass) {
        drawCompass(context, rover, radius, colorCompass);
    }
}
exports.default = render;
