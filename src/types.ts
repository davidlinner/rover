/**
 * Options for the simulation.
 */
export interface SimulationOptions {
    /**
     * Main control loop, called in fixed intervals.
     */
    loop: ControlLoop

    /**
     * Point on the globe which should be used as starting point for the simulation.
     */
    origin: Location

    /**
     * Points which should visualized statically. Mainly intended for debugging/demos.
     */
    locationsOfInterest: Array<LocationOfInterest>

    /**
     * Additional options for the visualization.
     */
    renderingOptions: RenderingOptions

    /**
     * Parent element the generated canvas should be added to.
     */
    element: HTMLElement
}

/**
 * A point on the globe.
 */
export interface Location {
    /**
     * The latitude value in decimal degree [-90 < x < 90]
     */
    latitude: number,

    /**
     * The longitude value of the location in degree [-180 < x < 180]
     */
    longitude: number
}

/**
 * A labeled point on the globe.
 */
export interface LocationOfInterest extends Location{
    label: string
}

/**
 * A composition of all sensor values available for the vehicle.
 */
export interface SensorValues {
    /**
     * Current position of the vehicle (measured from center of the vehicle).
     */
    location: Location,
    /**
     * Heading of the vehicle in degree [0 - 359.9...] where north is 0°, east is 90° ...
     */
    heading: number,

    /**
     * Time in milliseconds since the control loop with run the first time.
     */
    clock: number
}

/**
 * A composition of all actuator values for the vehicle.
 */
export interface ActuatorValues {

    /**
     * Power values of all engines, left to right, top to bottom. Values have to
     * be in the range [-1.0 : 1.0], where 0 means the vehicle is at rest.
     */
    engines: Array<number>
}

/**
 * Signature of the loop function.
 */
export type ControlLoop = (sensors: SensorValues, actuators: ActuatorValues) => ActuatorValues

/**
 * Additional options to control the visualization of the simulation.
 */
export interface RenderingOptions {
    /**
     * Width of the generated canvas.
     */
    width?: number

    /**
     * Heigth of the generated canvas.
     */
    height?: number

    /**
     * Renders background grid if true.
     */
    showGrid?: boolean

    /**
     * Renders vehicle trace path if true.
     */
    showTrace?: boolean

    /**
     * Hex color value of CSS color name for the grid lines.
     */
    colorGrid?: string

    /**
     * Hex color value of CSS color name for the trace path.
     */
    colorTrace?: string

    /**
     * Hex color value of CSS color name for rover.
     */
    colorRover?: string

    /**
     * Hex color value of CSS color name for markers.
     */
    colorMarker?: string
}
