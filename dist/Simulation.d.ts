import { Location, SimulationOptions } from "./types";
declare class Simulation {
    readonly context: CanvasRenderingContext2D;
    private world;
    private rover;
    private wheelConstraints;
    private engines;
    private readonly loop;
    private offset;
    private trace;
    private markers;
    private readonly renderingOptions;
    private lastRenderTime;
    private startTime;
    private interval;
    debug: Record<string, string>;
    constructor(simulationOptions: SimulationOptions);
    private createCanvas;
    private initMarkers;
    getRoverHeading(): number;
    getRoverLocation(): Location;
    start(): void;
    stop(): void;
    private trackPosition;
    private animate;
}
export { Simulation, SimulationOptions };
