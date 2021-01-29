import p2 from 'p2';
import LatLon from 'geodesy/latlon-spherical.js';

import render, {Marker, Obstacle, Point, Target} from './render';
import {distance} from './tools';
import {
    ActuatorValues,
    ControlLoop,
    Location,
    LocationOfInterest,
    PhysicalOptions,
    RenderingOptions,
    SimulationOptions,
    VehicleType,
} from './types';
import {AUTHENTICITY_LEVEL0} from './Authenticity';

const ROVER_WIDTH = 0.5;
const ROVER_HEIGHT = 1.0;
const ROVER_MASS_TYPE_ROVER = 10;
const ROVER_MASS_TYPE_TANK = 10;

export const TARGET_RADIUS = 0.15;

const MIN_TRACKING_POINT_DISTANCE = 1;

export const MAX_PROXIMITY_DISTANCE = 8;

const MAX_SUB_STEPS = 5; // Max physics ticks per render frame
const FIXED_DELTA_TIME = 1 / 60; // Physics "tick" delta time

const CONTROL_INTERVAL = 20; //ms

const BASE_ENGINE_FORCE_TYPE_ROVER = 2.3;
const BASE_ENGINE_FORCE_TYPE_TANK = 2.3;

const WHEEL_BREAK_FORCE_TYPE_ROVER = BASE_ENGINE_FORCE_TYPE_ROVER * 0.5;
const WHEEL_SIDE_FRICTION_TYPE_ROVER = BASE_ENGINE_FORCE_TYPE_ROVER * 2;

const WHEEL_BREAK_FORCE_TYPE_TANK = BASE_ENGINE_FORCE_TYPE_TANK * 0.5;
const WHEEL_SIDE_FRICTION_TYPE_TANK = BASE_ENGINE_FORCE_TYPE_TANK * 0.5;

const INITIAL_WHEEL_CONSTRAINTS_TYPE_ROVER: Array<{
    localPosition: [number, number];
    brakeForce: number;
    sideFriction: number;
}> = [
    {
        localPosition: [-0.25, 0.5],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_ROVER,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_ROVER,
    },
    {
        localPosition: [0.25, 0.5],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_ROVER,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_ROVER,
    },
    {
        localPosition: [-0.25, 0],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_ROVER,
        sideFriction: 0,
    },
    {
        localPosition: [0.25, 0],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_ROVER,
        sideFriction: 0,
    },
    {
        localPosition: [-0.25, -0.5],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_ROVER,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_ROVER,
    },
    {
        localPosition: [0.25, -0.5],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_ROVER,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_ROVER,
    },
];

const INITIAL_WHEEL_CONSTRAINTS_TYPE_TANK: Array<{
    localPosition: [number, number];
    brakeForce: number;
    sideFriction: number;
}> = [
    {
        localPosition: [-0.25, 0.25],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_TANK,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_TANK,
    },
    {
        localPosition: [0.25, 0.25],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_TANK,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_TANK,
    },
    {
        localPosition: [-0.25, 0],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_TANK,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_TANK,
    },
    {
        localPosition: [0.25, 0],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_TANK,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_TANK,
    },
    {
        localPosition: [-0.25, -0.25],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_TANK,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_TANK,
    },
    {
        localPosition: [0.25, -0.25],
        brakeForce: WHEEL_BREAK_FORCE_TYPE_TANK,
        sideFriction: WHEEL_SIDE_FRICTION_TYPE_TANK,
    },
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

    private vehicleType: VehicleType;

    private wheelConstraints: Array<p2.WheelConstraint>;
    private engines: ActuatorValues['engines'];

    private steering: ActuatorValues['steering'] = [180, 180, 180, 180];

    private readonly loop: ControlLoop;

    private offset: LatLon;

    private trace: Array<Point> = [];
    private markers: Array<Marker> = [];
    private obstacles: Array<Obstacle> = [];
    private proximityValues: Array<number> = [];
    private targets: Array<Target> = [];

    private readonly renderingOptions: RenderingOptions;
    private readonly physicalOptions: PhysicalOptions;

    private lastRenderTime = 0;
    private startTime = 0;
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
            targets = [],
            origin,
            vehicleType = VehicleType.Tank,
        } = simulationOptions;

        const {height = 500, width = 500} = renderingOptions;

        this.loop = loop;
        this.vehicleType = vehicleType;

        this.engines = vehicleType === VehicleType.Rover ? [0, 0, 0, 0, 0, 0] : [0, 0];

        // Init canvas
        const canvas = Simulation.createCanvas(element, width, height);
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Cannot create 2D rendering context for canvas.');
        }

        this.initMarkers(locationsOfInterest, origin);
        // Init P2 physics engine
        const world = new p2.World({
            gravity: [0, 0],
        });

        const rover = new p2.Body({
            mass: this.vehicleType === VehicleType.Rover ? ROVER_MASS_TYPE_ROVER : ROVER_MASS_TYPE_TANK,
        });
        rover.addShape(new p2.Box({width: ROVER_WIDTH, height: ROVER_HEIGHT}));
        world.addBody(rover);

        const vehicle = new p2.TopDownVehicle(rover);
        const wheelConstraints = (this.vehicleType === VehicleType.Rover
                ? INITIAL_WHEEL_CONSTRAINTS_TYPE_ROVER
                : INITIAL_WHEEL_CONSTRAINTS_TYPE_TANK
        ).map(({sideFriction, brakeForce, localPosition}) => {
            const wheelConstraint = vehicle.addWheel({localPosition});
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
            height,
        };

        this.physicalOptions = physicalConstraints({engineCount: 6}); // constant for the moment

        this.offset = new LatLon(origin.latitude, origin.longitude);

        this.initObstacles(origin, obstacles);
        this.initTargets(origin, targets);
        this.updateProximityValues();
    }

    private static createCanvas(parent: HTMLElement, width: number, height: number): HTMLCanvasElement {
        const document = parent.ownerDocument;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        parent.appendChild(canvas);
        return canvas;
    }

    private static toRelativeOffset(origin: Location, position: Location): [x: number, y: number] {
        const pos = new LatLon(position.latitude, position.longitude);

        const unsignedX = pos.distanceTo(new LatLon(pos.latitude, origin.longitude));
        const unsignedY = pos.distanceTo(new LatLon(origin.latitude, pos.longitude));

        const signedX = unsignedX * (origin.longitude - pos.longitude > 0 ? -1 : 1);
        const signedY = unsignedY * (origin.latitude - pos.latitude > 0 ? -1 : 1);

        return [signedX, signedY];
    }

    private initMarkers(locationsOfInterest: Array<LocationOfInterest>, origin: Location) {
        if (origin) {
            this.markers = locationsOfInterest.map((marker) => {
                const [x, y] = Simulation.toRelativeOffset(origin, marker);
                console.log('MARK ', x.toFixed(6), y.toFixed(6));

                return {
                    position: [x, y],
                    label: marker.label,
                };
            });
        }
    }

    private initTargets(origin: Location, targets: Array<{ latitude: number; longitude: number }>) {
        if (origin) {
            this.targets = targets.map((target) => {
                const [x, y] = Simulation.toRelativeOffset(origin, target);

                const targetShape = new p2.Circle({radius: TARGET_RADIUS, sensor: true, collisionResponse: false});
                const targetBody = new p2.Body({
                    mass: 0,
                    position: [-x, y],
                    fixedX: true,
                    fixedY: true,
                    fixedRotation: true,
                    collisionResponse: false,
                });

                targetBody.addShape(targetShape);
                this.world.addBody(targetBody);

                return {position: [x, y], latitude: target.latitude, longitude: target.longitude};
            });
        }
    }

    private initObstacles(origin: Location, obstacles: Array<{ latitude: number; longitude: number; radius: number }>) {
        if (origin) {
            this.obstacles = obstacles.map((obstacle) => {
                const [x, y] = Simulation.toRelativeOffset(origin, obstacle);

                const obstacleShape = new p2.Circle({radius: obstacle.radius});
                const obstacleBody = new p2.Body({
                    mass: 0, // static
                    position: [-x, y],
                    angle: 0,
                    angularVelocity: 0,
                    fixedX: true,
                    fixedY: true,
                    fixedRotation: true,
                    collisionResponse: true,
                });
                obstacleBody.addShape(obstacleShape);

                this.world.addBody(obstacleBody);

                return {
                    position: [x, y],
                    radius: obstacle.radius,
                };
            });
        }
    }

    private updateProximityValues() {
        const {errorProximity = (d) => d} = this.physicalOptions;

        const position = this.rover.interpolatedPosition;
        const [baseX, baseY] = position;

        const resolution = 180;

        for (let index = 0; index < resolution; index++) {
            const directionAngleInRadiant = ((Math.PI * 2) / resolution) * index + this.rover.interpolatedAngle;

            const xx = baseX + MAX_PROXIMITY_DISTANCE * Math.cos(directionAngleInRadiant + Math.PI / 2);
            const yy = baseY + MAX_PROXIMITY_DISTANCE * Math.sin(directionAngleInRadiant + Math.PI / 2);

            const to: [number, number] = [xx, yy];

            const ray = new p2.Ray({from: position, to, mode: p2.Ray.CLOSEST, skipBackfaces: true});
            const rayResult = new p2.RaycastResult();

            rayResult.reset();
            // Possible improvement: Only traverse through obstacles
            this.world.raycast(rayResult, ray);
            const rayDistance = Math.abs(rayResult.getHitDistance(ray));

            this.proximityValues[index] = errorProximity(rayDistance);
        }
    }

    private get targetFinderSignal() {
        // eslint-disable-next-line prettier/prettier
        const roverPos = [
            this.rover.interpolatedPosition[0] * -1, // Flip x axis back
            this.rover.interpolatedPosition[1],
        ] as [number, number];
        const roverCords = this.positionToCoordinates(roverPos);
        const roverLoc = new LatLon(roverCords.latitude, roverCords.longitude);

        let signalStrength = 0;

        for (const target of this.targets) {
            const targetCords = this.positionToCoordinates(target.position);
            const targetLoc = new LatLon(targetCords.latitude, targetCords.longitude);
            const distance = roverLoc.distanceTo(targetLoc);

            signalStrength += (1 / distance) * 0.02;
        }

        return Math.min(signalStrength, 1);
    }

    /**
     * Returns current rover heading.
     */
    private get roverHeading() {
        let heading = this.rover.angle % (2 * Math.PI);
        if (heading < 0) {
            heading += 2 * Math.PI;
        }
        const trueHeading = (180 / Math.PI) * heading;

        const {errorHeading = (d) => d} = this.physicalOptions;

        return errorHeading(trueHeading);
    }

    private positionToCoordinates(position: [x: number, y: number]) {
        const [x, y] = position;

        const coordinates = {
            longitude: this.offset.destinationPoint(Math.abs(x), x <= 0 ? 270 : 90).longitude,
            latitude: this.offset.destinationPoint(Math.abs(y), y <= 0 ? 180 : 0).latitude,
        };

        return coordinates;
    }

    /**
     * Returns current rover location.
     */
    private get roverLocation(): Location {
        // eslint-disable-next-line prettier/prettier
        const roverPos = [
            this.rover.interpolatedPosition[0] * -1, // Flip x axis back
            this.rover.interpolatedPosition[1],
        ] as [number, number];
        const trueLocation = this.positionToCoordinates(roverPos);

        const {errorLocation = (location) => location} = this.physicalOptions;

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
            const actuatorValues = this.loop(
                {
                    heading: this.roverHeading,
                    location: this.roverLocation,
                    proximity: this.proximityValues,
                    targetFinderSignal: this.targetFinderSignal,
                    clock,
                },
                {
                    engines: [...this.engines],
                    steering: [...this.steering],
                }
            );

            const {engines, steering} = actuatorValues;

            const {errorEngine = []} = this.physicalOptions;

            if(engines.length !== this.engines.length){
                console.error(`Invalid number of engine power arguments, expected ${this.engines.length}, found ${engines.length}`);
            } if(engines.find(value => value < -1.0 || value > 1.0)){
                console.error('One or more engine power values incorrect, must be in of range [-1.0 : 1.0]');
            } else {
                for (let i = 0; i < this.wheelConstraints.length; i++) {
                    const k = i % engines.length;
                    const errorFunction = errorEngine[i] || ((v) => v);
                    this.wheelConstraints[i].engineForce =
                        (this.vehicleType === VehicleType.Rover
                            ? BASE_ENGINE_FORCE_TYPE_ROVER
                            : BASE_ENGINE_FORCE_TYPE_TANK) * errorFunction(engines[k]);
                }
                this.engines = engines;
            }


            if (this.vehicleType === VehicleType.Rover) {
                if (steering.length === 4) {
                    steering.forEach((steeringValue, index) => {
                        if (steeringValue >= 0 || steeringValue <= 360) {
                            const mappedSteeringValue = ((steeringValue - 180) * Math.PI) / 180; // p2 needs rad
                            if (index <= 2) {
                                this.steering[index] = steeringValue;
                                this.wheelConstraints[index].steerValue = mappedSteeringValue;
                            } else {
                                this.steering[index + 2] = steeringValue;
                                this.wheelConstraints[index + 2].steerValue = mappedSteeringValue;
                            }
                        } else {
                            console.error('Steering value out of range [0 : 360]');
                        }
                    });
                } else {
                    console.error('The engines actuator array must have a length of 4 => [number x4]');
                }
            }
        }, CONTROL_INTERVAL);

        this.animationFrame = requestAnimationFrame(this.animate);
    }

    /**
     * Stops the simulation control loop.
     */
    public stop() {
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
                wheelConstraints: this.wheelConstraints,
            },
            this.trace,
            this.markers,
            this.obstacles,
            this.targets,
            this.proximityValues,
            this.renderingOptions
        );
    };
}

export {Simulation};
export type {SimulationOptions};
