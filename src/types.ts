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
     * Obstacle circles.
     */
    obstacles?: Array<{ latitude: number, longitude: number, radius: number }>

    /**
     * Additional options for the visualization.
     */
    renderingOptions: RenderingOptions

    /**
     * Additional options like measurement errors to create more authenticity on the simulation.
     */
    physicalConstraints?: PhysicalConstraints

    /**
     * Parent element the generated canvas should be added to.
     */
    element: HTMLElement
}

/**
 * Basic vehicle options
 */
export interface VehicleOptions {
	readonly engineCount: number;
}

/**
 * A point on the globe.
 */
export interface Location {
	/**
	 * The latitude value in decimal degree [-90 < x < 90]
	 */
	latitude: number;

	/**
	 * The longitude value of the location in degree [-180 < x < 180]
	 */
	longitude: number;
}

/**
 * A labeled point on the globe.
 */
export interface LocationOfInterest extends Location {
	label: string;
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
     * 360° distance values to obstacles in clockwise order ...
     */
    proximity: Array<number>,

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
    engines: [number, number, number, number, number, number]
	steering: [number, number, number, number]
}

/**
 * Add bias to an engine value.
 * Must return a value x with -1.0 => x <= 1.0.
 */
type EngineError = (value: number) => number;

/**
 * Add bias to a location value.
 */
type LocationError = (location: Location) => Location;

/**
 * Add bias to a heading value.
 * Must return a value a with  360 > x <= 0.
 */
type HeadingError = (value: number) => number;

/**
 * Add bias to a proximity value.
 */
type ProximityError = (distance: number) => number

/**
 * Collection of options to create more authenticity.
 */
export interface PhysicalOptions {

    /**
     * Use to meme derivations when engine forces are applied to the ground, like
     * hanging wheels. One function per engine.
     */
    readonly errorEngine?: Array<EngineError>

    /**
     * Use to add noise to the location provided by the location sensor.
     */
    readonly errorLocation?: LocationError

    /**
     * Use to add an error to the heading sensor value
     */
    readonly errorHeading?: HeadingError

    /**
     * Use to add errors to the proximity sensor values
     */
    readonly errorProximity?: ProximityError
}

/**
 * Factory to create physical properties based in vehicle options
 */
export type PhysicalConstraints = (vehicle: VehicleOptions) => PhysicalOptions;

/**
 * Signature of the loop function.
 */
export type ControlLoop = (sensors: SensorValues, actuators: ActuatorValues) => ActuatorValues;

/**
 * Additional options to control the visualization of the simulation.
 */
export interface RenderingOptions {
	/**
	 * Width of the generated canvas.
	 */
	width?: number;

	/**
	 * Heigth of the generated canvas.
	 */
	height?: number;

	/**
	 * Renders background grid if true.
	 */
	showGrid?: boolean;

	/**
	 * Renders vehicle trace path if true.
	 */
	showTrace?: boolean;

	/**
	 * Renders compass directions if true.
	 */
	showCompass?: boolean;

	/**
	 * Hex color value of CSS color name for the grid lines.
	 */
	colorGrid?: string;

	/**
	 * Hex color value of CSS color name for the trace path.
	 */
	colorTrace?: string;

	/**
	 * Hex color value of CSS color name for rover.
	 */
	colorRover?: string;

	/**
	 * Hex color value of CSS color name for markers.
	 */
	colorMarker?: string;

	/**
	 * Hex color value of CSS color name for compass.
	 */
	colorCompass?: string;
}
