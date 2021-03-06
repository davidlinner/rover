import { RenderingOptions } from './types';
import { TARGET_RADIUS, MAX_PROXIMITY_DISTANCE } from './Simulation';
import { WheelConstraint } from 'p2';

const SCALE = 15;
const GRID_GUTTER = 3;

export type Point = [x: number, y: number];

export interface Marker {
	label: string;
	position: Point;
}

export interface Obstacle {
	radius: number;
	position: Point;
}

export interface Target {
	position: Point;
}

export interface Rover {
	width: number;
	height: number;
	angle: number;
	position: Point;
	wheelConstraints: Array<WheelConstraint>;
}

function drawRover(context: CanvasRenderingContext2D, { width, height, wheelConstraints }: Rover, color: string) {
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

function drawTargets(context: CanvasRenderingContext2D, { angle, position }: Rover, targets: Target[]) {
	const roverX = position[0];
	const roverY = position[1];

	context.save();
	context.translate(context.canvas.width / 2, context.canvas.height / 2); // Translate to the center
	context.rotate(-angle); // Back to world space
	context.translate(roverX * SCALE, roverY * SCALE); // Translate to the center

	for (const target of targets) {
		context.save();

		const { position } = target;
		const targetX = position[0] * SCALE;
		const targetY = position[1] * -SCALE;
		const targetSize = TARGET_RADIUS * SCALE;

		context.translate(targetX, targetY);

		context.fillStyle = 'red';
		context.beginPath();
		context.arc(0, 0, targetSize, 0, Math.PI * 2);
		context.fill();

		context.restore();
	}

	context.restore();
}

function drawPath(context: CanvasRenderingContext2D, { position, angle }: Rover, trace: Array<Point>, color: string) {
	if (trace.length < 1) return;

	const [baseX, baseY] = position;

	context.save();

	context.strokeStyle = color;
	context.lineWidth = 0.1;
	context.rotate(angle); // Rotate to the box body frame

	context.beginPath();
	context.moveTo(0, 0);

	for (const [x, y] of trace) {
		context.lineTo(baseX - x, y - baseY);
	}
	context.stroke();

	context.restore();
}

function drawMarkers(
	context: CanvasRenderingContext2D,
	{ position, angle }: Rover,
	markers: Array<Marker>,
	radius: number,
	width: number,
	height: number,
	color: string
) {
	if (markers.length < 1) return;

	const roverX = position[0] * -1;
	const roverY = position[1];

	context.save();
	context.translate(width / 2, height / 2); // Translate to the center
	context.rotate(-angle); // Back to world space

	context.font = '21px monospace';
	context.fillStyle = color;
	context.textAlign = 'center';

	for (const marker of markers) {
		context.save();

		const { position, label } = marker;

		const [markerX, markerY] = position;

		const deltaX = markerX - roverX;
		const deltaY = markerY - roverY;

		const theta = Math.atan2(deltaY, deltaX); // degree from pos X axis
		const distance = Math.hypot(deltaX, deltaY) * SCALE;

		const maxDistance = radius - 15;

		context.save();

		// Walk to marker
		context.rotate((Math.PI / 2) * -1); // Rotate to x-axis
		context.rotate(-theta);
		context.translate(0, Math.min(distance, maxDistance));
		context.rotate(Math.PI / 2);

		// Rotate back to draw text
		context.rotate(theta);
		context.rotate(angle);

		if (distance < maxDistance) {
			const linearAlpha = Math.max(0, maxDistance - distance) / maxDistance;
			context.globalAlpha = Math.min(linearAlpha * 8, 1);
			// label = `${label}[${markerX.toFixed(8)}, ${markerY.toFixed(8)}]`; // DEBUG
			context.fillText(label, 0, -10);
			context.globalAlpha = 1;
		}

		context.beginPath();
		context.arc(0, 0, 2.5, 0, Math.PI * 2);
		context.fill();
		context.restore();

		context.restore();
	}

	context.restore();
}

function drawObstacles(context: CanvasRenderingContext2D, { position, angle }: Rover, obstacles: Obstacle[]) {
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

function drawProximityValues(context: CanvasRenderingContext2D, proximityValues: number[]) {
	context.save();
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

	context.restore();
}

function drawCompass(context: CanvasRenderingContext2D, { angle }: Rover, radius: number, color: string) {
	context.save();
	context.translate(context.canvas.width / 2, context.canvas.height / 2);
	context.rotate(-angle);

	const fontSize = 16;
	context.font = fontSize + 'px sans-serif';
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillStyle = color;

	const directions: Array<{ label: string; offset: [x: number, y: number] }> = [
		{ label: 'N', offset: [0, -radius + fontSize] },
		{ label: 'E', offset: [radius - fontSize, 0] },
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

function drawGrid(context: CanvasRenderingContext2D, { position, angle }: Rover, rasterSize: number, color: string) {
	const x = position[0];
	const y = 0 - position[1];

	context.save();

	context.rotate(angle); // Rotate to the box body frame

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
	targets: Array<Target>,
	proximityValues: Array<number>,
	options: RenderingOptions
) {
	const {
		height = 500,
		width = 500,
		showGrid = true,
		showTrace = true,
		showCompass = true,
		colorTrace = 'blue',
		colorRover = 'red',
		colorMarker = 'CornflowerBlue',
		colorGrid = 'lightgreen',
		colorCompass = 'lime',
	} = options;

	// Clear the canvas
	context.fillStyle = 'black';
	context.fillRect(0, 0, width, height);
	//ctx.clearRect(0, 0, w, h);

	// Transform the canvas
	// Note that we need to flip the y axis since Canvas pixel coordinates
	// goes from top to bottom, while physics does the opposite.
	context.save();
	context.translate(width / 2, height / 2); // Translate to the center

	context.beginPath();

	context.lineWidth = 0.5;
	context.strokeStyle = colorGrid;

	const radius = Math.min(width, height) / 2;

	context.arc(0, 0, radius - 1, 0, Math.PI * 2, true);
	context.stroke();

	context.beginPath();
	context.arc(0, 0, radius, 0, Math.PI * 2);
	context.clip();

	context.scale(SCALE, -SCALE); // Zoom in and flip y axis

	// Draw
	if (showGrid) {
		drawGrid(context, rover, Math.ceil((width / SCALE / GRID_GUTTER) * 1.2), colorGrid);
	}
	if (showTrace) {
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
	drawTargets(context, rover, targets);
}
