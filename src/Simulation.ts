import p2 from 'p2';
import LatLon from 'geodesy/latlon-spherical.js'

import render, {Marker, Point} from "./render";
import {distance} from "./tools";
import {
    ControlLoop,
    Location,
    LocationOfInterest, PhysicalOptions,
    RenderingOptions,
    SimulationOptions
} from "./types";
import {AUTHENTICITY_LEVEL0} from "./Authenticity";

const ROVER_WIDTH = .5;
const ROVER_HEIGHT = 1.0;

const MIN_TRACKING_POINT_DISTANCE = 1;

const MAX_SUB_STEPS = 5; // Max physics ticks per render frame
const FIXED_DELTA_TIME = 1 / 60; // Physics "tick" delta time

const CONTROL_INTERVAL = 20; //ms

const BASE_ENGINE_FORCE = 2.0;

const INITIAL_WHEEL_CONSTRAINTS: Array<{ localPosition: [number, number], brakeForce: number, sideFriction: number }> = [
    {
        localPosition: [.01, 0],
        brakeForce: 1.0,
        sideFriction: 3.0
    }, {
        localPosition: [-.01, 0],
        brakeForce: 1.0,
        sideFriction: 3.0
    }
]

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

    private readonly context: CanvasRenderingContext2D

    private world: p2.World
    private rover: p2.Body

    private wheelConstraints: Array<p2.WheelConstraint>
    private engines: Array<number> = INITIAL_WHEEL_CONSTRAINTS.map(() => 0)

    private readonly loop: ControlLoop

    private offset: LatLon;

    private trace: Array<Point> = []
    private markers: Array<Marker> = []

    private readonly renderingOptions: RenderingOptions;
    private readonly physicalOptions: PhysicalOptions;

    private lastRenderTime: number = 0
    private startTime: number = 0
    private interval: number | null = null
    private animationFrame: number | null = null

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
            vehicleOptions = {engineCount:2},
            physicalConstraints = AUTHENTICITY_LEVEL0,
            locationsOfInterest = [],
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

        const rover = new p2.Body({mass: 1});
        rover.addShape(
            new p2.Box({width: ROVER_WIDTH, height: ROVER_HEIGHT}));
        world.addBody(rover);

        const vehicle = new p2.TopDownVehicle(rover);
        const wheelConstraints = INITIAL_WHEEL_CONSTRAINTS.map(({sideFriction, brakeForce, localPosition}) => {
            // Add one front wheel and one back wheel - we don't actually need four :)
            const wheelConstraint = vehicle.addWheel({localPosition});
            wheelConstraint.setSideFriction(sideFriction)
            wheelConstraint.setBrakeForce(brakeForce);

            return wheelConstraint;
        })
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

        this.physicalOptions = physicalConstraints(vehicleOptions);

        this.offset = new LatLon(origin.latitude, origin.longitude);
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
        console.log('lois', locationsOfInterest);
        if (origin) {
            this.markers = locationsOfInterest.map(({label, latitude, longitude}) => {
                const markerLatLon = new LatLon(latitude, longitude);

                const x = markerLatLon.distanceTo(new LatLon(latitude, origin.longitude));
                const y = markerLatLon.distanceTo(new LatLon(origin.latitude, longitude));

                return {
                    position: [x, y],
                    label
                }
            })
            console.log(this.markers);
        }
    }

    /**
     * Returns current rover heading.
     */
    getRoverHeading() {
        let heading = this.rover.angle % (2 * Math.PI);
        if (heading < 0) {
            heading += 2 * Math.PI
        }
        const trueHeading =  (180 / Math.PI) * heading;

        const {
            errorHeading = d=>d
        } = this.physicalOptions;

        return errorHeading(trueHeading);
    }

    /**
     * Returns current rover location.
     */
    getRoverLocation(): Location {
        const [x, y] = this.rover.interpolatedPosition;

        const trueLocation = {
            longitude: this.offset.destinationPoint(Math.abs(x), x <= 0 ? 270 : 90).longitude,
            latitude: this.offset.destinationPoint(Math.abs(y), y <= 0 ? 180 : 0).latitude
        }

        const {
            errorLocation = location => location
        } = this.physicalOptions;

        return errorLocation(trueLocation);
    }

    /**
     * Starts the simulation control loop at an interval less than 50ms.
     */
    start() {
        if(this.interval){
            throw new Error('Simulation is already running.')
        }

        this.startTime = performance.now();

        this.interval = window.setInterval(() => {

            const clock = performance.now() - this.startTime;
            const actuatorValues = this.loop({
                heading: this.getRoverHeading(),
                location: this.getRoverLocation(),
                clock,
            }, {
                engines: this.engines
            })

            const {
                engines
            } = actuatorValues;

            const {
                errorEngine = []
            } = this.physicalOptions;

            if (engines.length === this.engines.length) {
                for(let i = 0; i < engines.length; i++){
                    if(engines[i]<=1.0 && engines[i]>= -1.0){
                        this.engines[i] = engines[i];

                        const errorFunction = errorEngine[i] || (v=>v);

                        this.wheelConstraints[i].engineForce = BASE_ENGINE_FORCE * errorFunction(engines[i]);
                    } else {
                        console.log('Wheel power out of range [-1.0 : 1.0]');
                    }
                }
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

    private animate = (time: number)  => {
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
                height: ROVER_HEIGHT
            },
            this.trace,
            this.markers,
            this.renderingOptions);
    }
}

export {Simulation, SimulationOptions}
