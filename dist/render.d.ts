import { RenderingOptions } from './types';
export declare type Point = [number, number];
export interface Marker {
    label: string;
    position: Point;
}
export interface Rover {
    width: number;
    height: number;
    angle: number;
    position: Point;
}
export default function render(context: CanvasRenderingContext2D, rover: Rover, trace: Array<Point>, markers: Array<Marker>, options: RenderingOptions): void;
