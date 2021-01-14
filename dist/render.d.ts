import { RenderingOptions } from "./types";
import { WheelConstraint } from "p2";
export declare type Point = [number, number];
export interface Marker {
    label: string;
    position: Point;
}
export interface Obstacle {
    radius: number;
    position: Point;
}
export interface Rover {
    width: number;
    height: number;
    angle: number;
    position: Point;
    wheelConstraints: Array<WheelConstraint>;
}
export default function render(context: CanvasRenderingContext2D, rover: Rover, trace: Array<Point>, markers: Array<Marker>, obstacles: Array<Obstacle>, proximityValues: Array<number>, options: RenderingOptions): void;
