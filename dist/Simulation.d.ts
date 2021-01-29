import { SimulationOptions } from './types';
export declare const TARGET_RADIUS = 0.15;
export declare const MAX_PROXIMITY_DISTANCE = 8;
declare class Simulation {
    readonly context: CanvasRenderingContext2D;
    private world;
    private rover;
    private roverType;
    private wheelConstraints;
    private engines;
    private steering;
    private readonly loop;
    private offset;
    private trace;
    private markers;
    private obstacles;
    private proximityValues;
    private targets;
    private readonly renderingOptions;
    private readonly physicalOptions;
    private lastRenderTime;
    private startTime;
    private interval;
    private animationFrame;
    constructor(simulationOptions: SimulationOptions);
    private static createCanvas;
    private static toRelativeOffset;
    private initMarkers;
    private initTargets;
    private initObstacles;
    private updateProximityValues;
    private get targetFinderSignal();
    private get roverHeading();
    private positionToCoordinates;
    private get roverLocation();
    start(): void;
    stop(): void;
    private trackPosition;
    private animate;
}
export { Simulation };
export type { SimulationOptions };
