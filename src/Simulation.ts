import p2 from 'p2';
import LatLon from 'geodesy/latlon-spherical.js';

import render, { Marker, Obstacle, Point } from './render';
import { distance } from './tools';
import {
	ActuatorValues,
	ControlLoop,
	Location,
	LocationOfInterest, PhysicalOptions,
	RenderingOptions,
	SimulationOptions
} from './types';
import { AUTHENTICITY_LEVEL0 } from './Authenticity';

const ROVER_WIDTH = .5;
const ROVER_HEIGHT = 1.0;

const MIN_TRACKING_POINT_DISTANCE = 1;

export const MAX_PROXIMITY_DISTANCE = 8;

const MAX_SUB_STEPS = 5; // Max physics ticks per render frame
const FIXED_DELTA_TIME = 1 / 60; // Physics "tick" delta time

const CONTROL_INTERVAL = 20; //ms

const BASE_ENGINE_FORCE = 1.0;

const WHEEL_BREAK_FORCE = 0.5;
const WHEEL_SIDE_FRICTION = 1.5;

const INITIAL_WHEEL_CONSTRAINTS: Array<{ localPosition: [number, number], brakeForce: number, sideFriction: number }> = [
	{
		localPosition: [0.25, 0.25],
		brakeForce: WHEEL_BREAK_FORCE,
		sideFriction: WHEEL_SIDE_FRICTION
	},
	{
		localPosition: [-0.25, 0.25],
		brakeForce: WHEEL_BREAK_FORCE,
		sideFriction: WHEEL_SIDE_FRICTION
	},
	{
		localPosition: [0.25, 0],
		brakeForce: WHEEL_BREAK_FORCE,
		sideFriction: WHEEL_SIDE_FRICTION
	},
	{
		localPosition: [-0.25, 0],
		brakeForce: WHEEL_BREAK_FORCE,
		sideFriction: WHEEL_SIDE_FRICTION
	},
	{
		localPosition: [0.25, -0.25],
		brakeForce: WHEEL_BREAK_FORCE,
		sideFriction: WHEEL_SIDE_FRICTION
	},
	{
		localPosition: [-0.25, -0.25],
		brakeForce: WHEEL_BREAK_FORCE,
		sideFriction: WHEEL_SIDE_FRICTION
	}
];

/**
 *
 * A simple, open world top down simulation for a program controlled vehicle.
 *
 * Example for initialization
 * ```
 * const loop = ({location, heading, clock}, {engines}) => {
 *   return { engines: [0.7,0.8] }
 * }
 *
 * const simulation = new Simulation({
 *    loop,
 *    origin: {
 *       latitude:52.477050353132384,
 *       longitude:13.395281227289209
 *    },
 *    element: document.querySelector('main'),
 *    locationsOfInterest: [{
 *       latitude: 52.47880703639255,
 *       longitude: 13.395281227289209,
 *       label: 'A'
 *    }],
 * });
 *
 * simulation.start();
 * ```
 *
 */

class Simulation {

	readonly context: CanvasRenderingContext2D;

	private world: p2.World;
	private rover: p2.Body;

	private wheelConstraints: Array<p2.WheelConstraint>;
	private engines: ActuatorValues['engines'] = [
		0, 0,
		0, 0,
		0, 0
	];

	private steering: ActuatorValues['steering'] = [
		180, 180,
		180, 180
	];

	private readonly loop: ControlLoop;

	private offset: LatLon;

	private trace: Array<Point> = [];
	private markers: Array<Marker> = [];
	private obstacles: Array<Obstacle> = [];
	private proximityValues: Array<number> = [];

	private readonly renderingOptions: RenderingOptions;
	private readonly physicalOptions: PhysicalOptions;

	private lastRenderTime: number = 0;
	private startTime: number = 0;
	private interval: number | null = null;
	private animationFrame: number | null = null;

	/**
	 * Initializes a new simulation an starts the visualization without starting the control loop.
	 *
	 * @param simulationOptions Options to run the simulation with.
	 */
	constructor(simulationOptions: SimulationOptions) {

		const {
			loop,
			element,
			renderingOptions = {},
			physicalConstraints = AUTHENTICITY_LEVEL0,
			locationsOfInterest = [],
			obstacles = [],
			origin
		} = simulationOptions;

		const {
			height = 500,
			width = 500
		} = renderingOptions;

		this.loop = loop;

		// Init canvas
		const canvas = this.createCanvas(element, width, height);
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Cannot create 2D rendering context for canvas.');
		}

		this.initMarkers(locationsOfInterest, origin);
		// Init P2 physics engine
		const world = new p2.World({
			gravity: [0, 0]
		});

		const rover = new p2.Body({ mass: 1 });
		rover.addShape(
			new p2.Box({ width: ROVER_WIDTH, height: ROVER_HEIGHT }));
		world.addBody(rover);

		const vehicle = new p2.TopDownVehicle(rover);
		const wheelConstraints = INITIAL_WHEEL_CONSTRAINTS.map(({ sideFriction, brakeForce, localPosition }) => {
			// Add one front wheel and one back wheel - we don't actually need four :)
			const wheelConstraint = vehicle.addWheel({ localPosition });
			wheelConstraint.setSideFriction(sideFriction);
			wheelConstraint.setBrakeForce(brakeForce);

			return wheelConstraint;
		});
		vehicle.addToWorld(world);

		this.world = world;
		this.rover = rover;
		this.wheelConstraints = wheelConstraints;

		this.context = context;
		this.renderingOptions = {
			...renderingOptions,
			width,
			height
		};

		this.physicalOptions = physicalConstraints({ engineCount: 2 }); // constant for the moment

		this.offset = new LatLon(origin.latitude, origin.longitude);

		this.initObstacles(origin, obstacles);
		this.updateProximityValues();
	}

	private createCanvas(parent: HTMLElement, width: number, height: number): HTMLCanvasElement {
		const document = parent.ownerDocument;
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		parent.appendChild(canvas);
		return canvas;
	}

	private initMarkers(locationsOfInterest: Array<LocationOfInterest>, origin: Location) {
		if (origin) {
			this.markers = locationsOfInterest.map(({ label, latitude, longitude }) => {
				const marker = new LatLon(latitude, longitude);

				const unsignedX = marker.distanceTo(new LatLon(latitude, origin.longitude));
				const unsignedY = marker.distanceTo(new LatLon(origin.latitude, longitude));

				const signedX = unsignedX * ((origin.longitude - marker.longitude) > 0 ? -1 : 1);
				const signedY = unsignedY * ((origin.latitude - marker.latitude) > 0 ? -1 : 1);

				return {
					position: [signedX, signedY],
					label
				};
			});
		}
	}

	private initObstacles(origin: Location, obstacles: Array<{ latitude: number, longitude: number, radius: number }>) {
		if (origin) {
			this.obstacles = obstacles.map(({ radius, latitude, longitude }) => {
				const obstacleLatLon = new LatLon(latitude, longitude);

				const unsignedX = obstacleLatLon.distanceTo(new LatLon(latitude, origin.longitude));
				const unsignedY = obstacleLatLon.distanceTo(new LatLon(origin.latitude, longitude));

				const signedX = unsignedX * ((origin.longitude - obstacleLatLon.longitude) > 0 ? -1 : 1);
				const signedY = unsignedY * ((origin.latitude - obstacleLatLon.latitude) > 0 ? -1 : 1);

				const obstacleShape = new p2.Circle({ radius });
				const obstacleBody = new p2.Body({
					mass: 0, // static
					position: [signedX, signedY],
					angle: 0,
					angularVelocity: 0,
					fixedX: true,
					fixedY: true,
					fixedRotation: true,
					collisionResponse: true
				});
				obstacleBody.addShape(obstacleShape);

				this.world.addBody(obstacleBody);

				return {
					position: [signedX, signedY],
					radius
				};
			});
		}
	}

	private updateProximityValues() {
		const {
			errorProximity = d => d
		} = this.physicalOptions;

		const position = this.rover.interpolatedPosition;
		const [baseX, baseY] = position;

		const resolution = 180;

		for (let index = 0; index < resolution; index++) {
			const directionAngleInRadiant = (((Math.PI * 2) / resolution) * index) + this.rover.interpolatedAngle;

			const xx = baseX + (MAX_PROXIMITY_DISTANCE * Math.cos(directionAngleInRadiant + Math.PI / 2));
			const yy = baseY + (MAX_PROXIMITY_DISTANCE * Math.sin(directionAngleInRadiant + Math.PI / 2));

			const to: [number, number] = [xx, yy];

			const ray = new p2.Ray({ from: position, to, mode: p2.Ray.CLOSEST, skipBackfaces: true });
			const rayResult = new p2.RaycastResult();

			rayResult.reset();
			// Possible improvement: Only traverse through obstacles
			this.world.raycast(rayResult, ray);
			let rayDistance = rayResult.getHitDistance(ray);

			if (rayDistance < 0) {
				rayDistance = rayDistance * -1;
			}

			this.proximityValues[index] = errorProximity(rayDistance);
		}
	}

	/**
	 * Returns current rover heading.
	 */
	getRoverHeading() {
		let heading = this.rover.angle % (2 * Math.PI);
		if (heading < 0) {
			heading += 2 * Math.PI;
		}
		const trueHeading = (180 / Math.PI) * heading;

		const {
			errorHeading = d => d
		} = this.physicalOptions;

		return errorHeading(trueHeading);
	}

	/**
	 * Returns current rover location.
	 */
	getRoverLocation(): Location {
		const [x, y] = this.rover.interpolatedPosition;

		const trueLocation = {
			longitude: this.offset.destinationPoint(Math.abs(x), x <= 0 ? 90 : 270).longitude,
			latitude: this.offset.destinationPoint(Math.abs(y), y <= 0 ? 180 : 0).latitude
		};

		const {
			errorLocation = location => location
		} = this.physicalOptions;

		return errorLocation(trueLocation);
	}

	/**
	 * Starts the simulation control loop at an interval less than 50ms.
	 */
	start() {
		if (this.interval) {
			throw new Error('Simulation is already running.');
		}

		this.startTime = performance.now();

		this.interval = window.setInterval(() => {

			const clock = performance.now() - this.startTime;

			this.updateProximityValues();
			const actuatorValues = this.loop({
				heading: this.getRoverHeading(),
				location: this.getRoverLocation(),
				proximity: this.proximityValues,
				clock
			}, {
				engines: this.engines,
				steering: this.steering
			});

			const {
				engines,
				steering
			} = actuatorValues;

			const {
				errorEngine = []
			} = this.physicalOptions;

			if (engines.length === 6) {
				for (let i = 0; i < engines.length; i++) {
					if (engines[i] <= 1.0 && engines[i] >= -1.0) {
						this.engines[i] = engines[i];
						const errorFunction = errorEngine[i] || (v => v);
						this.wheelConstraints[i].engineForce = BASE_ENGINE_FORCE * errorFunction(engines[i]);
					} else {
						console.error('Wheel power out of range [-1.0 : 1.0]');
					}
				}
			}

			if (steering.length === 4) {
			    steering.forEach((steeringValue, index) => {
			        if (steeringValue >= 0 || steeringValue <= 360) {
			        	const mappedSteeringValue = (steeringValue - 180) * Math.PI / 180 // p2 needs rad
			            this.steering[index] = steeringValue
                        this.wheelConstraints[index].steerValue = mappedSteeringValue
                    } else {
			            console.error('Steering value out of range [0 : 360]')
                    }
                })
            }

		}, CONTROL_INTERVAL);

		this.animationFrame = requestAnimationFrame(this.animate);
	}

	/**
	 * Stops the simulation control loop.
	 */
	stop() {
		if (this.interval != null) {
			clearInterval(this.interval);
			this.interval = null;
		}

		if (this.animationFrame != null) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}
	}

	private trackPosition() {
		const position = this.rover.interpolatedPosition;

		const [lastPosition] = this.trace;
		if (!lastPosition || distance(lastPosition, position) > MIN_TRACKING_POINT_DISTANCE) {
			this.trace.unshift([...position]);
		}
	}

	private animate = (time: number) => {
		this.animationFrame = requestAnimationFrame(this.animate);

		// Get the elapsed time since last frame, in seconds
		let deltaTime = this.lastRenderTime ? (time - this.lastRenderTime) / 1000 : 0;
		this.lastRenderTime = time;

		// Make sure the time delta is not too big (can happen if user switches browser tab)
		deltaTime = Math.min(1 / 10, deltaTime);

		// Move physics bodies forward in time
		this.world.step(FIXED_DELTA_TIME, deltaTime, MAX_SUB_STEPS);

		this.trackPosition();

		// Render scene
		render(
			this.context,
			{
				position: this.rover.interpolatedPosition,
				angle: this.rover.angle,
				width: ROVER_WIDTH,
				height: ROVER_HEIGHT,
				wheelConstraints: this.wheelConstraints
			},
			this.trace,
			this.markers,
			this.obstacles,
			this.proximityValues,
			this.renderingOptions
		);
	};
}

export { Simulation, SimulationOptions };
