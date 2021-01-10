export interface SimulationOptions {
    loop: ControlLoop;
    origin: Location;
    locationsOfInterest: Array<LocationOfInterest>;
    renderingOptions: RenderingOptions;
    element: HTMLElement;
}
export interface Location {
    latitude: number;
    longitude: number;
}
export interface LocationOfInterest extends Location {
    label: string;
}
export interface SensorValues {
    location: Location;
    heading: number;
    clock: number;
}
export interface ActuatorValues {
    engines: Array<number>;
    debug?: Record<string, string>;
}
export declare type ControlLoop = (sensors: SensorValues, actuators: ActuatorValues) => ActuatorValues;
export interface RenderingOptions {
    width?: number;
    height?: number;
    showGrid?: boolean;
    showTrace?: boolean;
    showCompass?: boolean;
    colorGrid?: string;
    colorTrace?: string;
    colorRover?: string;
    colorMarker?: string;
    colorCompass?: string;
}
