import { RenderingOptions } from "./types";
import { World } from "p2";
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
}
export default function render(context: CanvasRenderingContext2D, world: World, rover: Rover, trace: Array<Point>, markers: Array<Marker>, obstacles: Array<Obstacle>, options: RenderingOptions): void;
