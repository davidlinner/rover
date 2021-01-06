import p2 from 'p2';
import LatLon from 'geodesy/latlon-spherical.js'

import render, {RenderingOptions, Marker, Point} from "./render";
import {distance} from "./tools";
import {ControlLoop, Location, LocationOfInterest} from "./types";

const ROVER_WIDTH = .5;
const ROVER_HEIGHT = 1.0;

const MIN_TRACKING_POINT_DISTANCE = 1;

const MAX_SUB_STEPS = 5; // Max physics ticks per render frame
const FIXED_DELTA_TIME = 1 / 60; // Physics "tick" delta time

const CONTROL_INTERVAL = 20; //ms

const BASE_ENGINE_FORCE = 4.0;

const INITIAL_WHEEL_CONSTRAINTS: Array<{ localPosition: [number, number], brakeForce: number, sideFriction: number }> = [
    {
        localPosition: [-0.25, 0.5],
        brakeForce: 1.75,
        sideFriction: 4.0
    }, {
        localPosition: [0.25, 0.5],
        brakeForce: 1.75,
        sideFriction: 4.0
    }, {
        localPosition: [-0.25, -0.5],
        brakeForce: 1.75,
        sideFriction: 4.0
    }, {
        localPosition: [0.25, -0.5],
        brakeForce: 1.75,
        sideFriction: 4.0
    },
]

interface SimulationConfiguration {
    loop: ControlLoop
    origin: Location
    locationsOfInterest: Array<LocationOfInterest>
    renderingOptions: RenderingOptions
    element: HTMLElement
}

export default class Simulation {

    private readonly context: CanvasRenderingContext2D

    private world: p2.World
    private rover: p2.Body

    private wheelConstraints: Array<p2.WheelConstraint>
    private wheels: Array<number> = INITIAL_WHEEL_CONSTRAINTS.map(() => 0)

    private readonly loop: ControlLoop

    private offset: LatLon;

    private trace: Array<Point> = []
    private markers: Array<Marker> = []

    private readonly renderingOptions: RenderingOptions;

    private lastRenderTime: number = 0
    private startTime: number = 0
    private interval: any

    constructor(configuration: SimulationConfiguration) {

        const {
            loop,
            element,
            renderingOptions,
            locationsOfInterest = [],
            origin
        } = configuration;

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

        this.offset = new LatLon(origin.latitude, origin.longitude);

        this.animate.bind(this);
        requestAnimationFrame(this.animate);
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
            this.markers = locationsOfInterest.map(({label, latitude, longitude}) => {
                const markerLatLon = new LatLon(latitude, longitude);

                const x = markerLatLon.distanceTo(new LatLon(latitude, origin.longitude));
                const y = markerLatLon.distanceTo(new LatLon(origin.latitude, longitude));

                return {
                    position: [x, y],
                    label
                }
            })
        }
    }

    getRoverHeading() {
        let heading = this.rover.angle % (2 * Math.PI);
        if (heading < 0) {
            heading += 2 * Math.PI
        }
        return (180 / Math.PI) * heading;
    }

    getRoverLocation(): Location {
        const [x, y] = this.rover.interpolatedPosition;

        return {
            longitude: this.offset.destinationPoint(Math.abs(x), x <= 0 ? 270 : 90).longitude,
            latitude: this.offset.destinationPoint(Math.abs(y), y <= 0 ? 0 : 180).latitude
        }
    }

    start() {
        if(this.interval){
            throw new Error('Simulation is already running.')
        }

        this.startTime = (new Date()).getTime();

        this.interval = setInterval(() => {

            const clock = (new Date()).getTime() - this.startTime;
            const actuatorValues = this.loop({
                heading: this.getRoverHeading(),
                location: this.getRoverLocation(),
                clock,
            }, {
                wheels: this.wheels
            })

            const {
                wheels
            } = actuatorValues;

            if (wheels.length === this.wheels.length) {
                this.wheels = wheels;

                for(let i = 0; i < wheels.length; i++){
                    this.wheelConstraints[i].engineForce = BASE_ENGINE_FORCE * wheels[i]
                }
            }

        }, CONTROL_INTERVAL);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
    }

    private trackPosition() {
        const point = this.rover.interpolatedPosition;

        const [lastPoint] = this.trace;

        if (!lastPoint || distance(lastPoint, point) > MIN_TRACKING_POINT_DISTANCE) {
            this.trace.unshift(point);
        }
    }

    private animate(time: number) {
        requestAnimationFrame(this.animate);

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
