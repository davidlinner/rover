"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Simulation_1 = require("./Simulation");
const SCALE = 15;
const GRID_GUTTER = 3;
function drawRover(context, { width, height, wheelConstraints }, color) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 0.1;
    context.strokeRect(-width / 2, -height / 2, width, height);
    context.restore();
    const [wheelWidth, wheelHeight] = [0.1, 0.15];
    for (const { localPosition } of wheelConstraints) {
        const [x, y] = localPosition;
        context.save();
        context.fillStyle = 'salmon';
        context.fillRect(x - wheelWidth / 2, y - wheelHeight / 2, wheelWidth, wheelHeight);
        context.restore();
    }
}
function drawLandmines(context, { angle, position }, mines) {
    const roverX = position[0];
    const roverY = position[1];
    context.save();
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(-angle);
    context.translate(roverX * SCALE, roverY * SCALE);
    for (let mine of mines) {
        context.save();
        const { position } = mine;
        const mineX = position[0] * SCALE;
        const mineY = position[1] * -SCALE;
        const mineSize = Simulation_1.LANDMINE_RADIUS * SCALE;
        context.translate(mineX, mineY);
        context.fillStyle = 'red';
        context.beginPath();
        context.arc(0, 0, mineSize, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
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
function drawMarkers(context, { position, angle }, markers, radius, width, height, color) {
    if (markers.length < 1)
        return;
    const roverX = position[0] * -1;
    const roverY = position[1];
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(-angle);
    context.font = '21px monospace';
    context.fillStyle = color;
    context.textAlign = 'center';
    let index = 0;
    for (let marker of markers) {
        context.save();
        let { position, label } = marker;
        const [markerX, markerY] = position;
        const deltaX = markerX - roverX;
        const deltaY = markerY - roverY;
        let theta = Math.atan2(deltaY, deltaX);
        const distance = Math.hypot(deltaX, deltaY) * SCALE;
        const maxDistance = radius - 15;
        context.save();
        context.rotate((Math.PI / 2) * -1);
        context.rotate(-theta);
        context.translate(0, Math.min(distance, maxDistance));
        context.rotate(Math.PI / 2);
        context.rotate(theta);
        context.rotate(angle);
        if (distance < maxDistance) {
            const linearAlpha = Math.max(0, maxDistance - distance) / maxDistance;
            context.globalAlpha = Math.min(linearAlpha * 8, 1);
            context.fillText(label, 0, -10);
            context.globalAlpha = 1;
        }
        context.beginPath();
        context.arc(0, 0, 2.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
        index++;
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
    context.fillStyle = 'rgba(255, 255, 255, 0.15)';
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 0.1;
    for (const obstacle of obstacles) {
        const { position, radius } = obstacle;
        const x = position[0] * -1;
        const y = position[1];
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
function drawProximityValues(context, proximityValues) {
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
function render(context, rover, trace, markers, obstacles, landmines, proximityValues, options) {
    const { height = 500, width = 500, showGrid = true, showTrace = true, showCompass = true, colorTrace = 'blue', colorRover = 'red', colorMarker = 'CornflowerBlue', colorGrid = 'lightgreen', colorCompass = 'lime', } = options;
    context.fillStyle = 'black';
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
        drawGrid(context, rover, Math.ceil((width / SCALE / GRID_GUTTER) * 1.2), colorGrid);
    }
    if (showTrace) {
        drawPath(context, rover, trace, colorTrace);
    }
    drawRover(context, rover, colorRover);
    context.restore();
    drawObstacles(context, rover, obstacles);
    drawProximityValues(context, proximityValues);
    if (showCompass) {
        drawCompass(context, rover, radius, colorCompass);
    }
    drawMarkers(context, rover, markers, radius, width, height, colorMarker);
    drawLandmines(context, rover, landmines);
}
exports.default = render;
