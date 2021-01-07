"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    for (let marker of markers) {
        const { position: [x, y], label = 'X' } = marker;
        context.font = "2px SansSerif";
        context.fillStyle = "purple";
        context.textAlign = "center";
        context.translate(baseX - x, baseY - y);
        context.rotate(angle);
        context.fillText(label, 0, -1);
        context.beginPath();
        context.arc(0, 0, .25, 0, Math.PI * 2);
        context.fill();
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
function render(context, rover, trace, markers, options) {
    const { height = 500, width = 500, showGrid = true, showTrace = true, colorTrace = 'blue', colorRover = 'red', colorMarker = 'purple', colorGrid = 'lightgreen' } = options;
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
}
exports.default = render;
