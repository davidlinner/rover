"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Simulation = void 0;
const p2_1 = __importDefault(require("p2"));
const latlon_spherical_js_1 = __importDefault(require("geodesy/latlon-spherical.js"));
const render_1 = __importDefault(require("./render"));
const tools_1 = require("./tools");
const ROVER_WIDTH = .5;
const ROVER_HEIGHT = 1.0;
const MIN_TRACKING_POINT_DISTANCE = 1;
const MAX_SUB_STEPS = 5;
const FIXED_DELTA_TIME = 1 / 60;
const CONTROL_INTERVAL = 20;
const BASE_ENGINE_FORCE = 2.0;
const INITIAL_WHEEL_CONSTRAINTS = [
    {
        localPosition: [.01, 0],
        brakeForce: 1.0,
        sideFriction: 3.0
    }, {
        localPosition: [-.01, 0],
        brakeForce: 1.0,
        sideFriction: 3.0
    },
];
class Simulation {
    constructor(simulationOptions) {
        this.engines = INITIAL_WHEEL_CONSTRAINTS.map(() => 0);
        this.trace = [];
        this.markers = [];
        this.lastRenderTime = 0;
        this.startTime = 0;
        this.interval = null;
        this.animationFrame = null;
        this.animate = (time) => {
            this.animationFrame = requestAnimationFrame(this.animate);
            let deltaTime = this.lastRenderTime ? (time - this.lastRenderTime) / 1000 : 0;
            this.lastRenderTime = time;
            deltaTime = Math.min(1 / 10, deltaTime);
            this.world.step(FIXED_DELTA_TIME, deltaTime, MAX_SUB_STEPS);
            this.trackPosition();
            render_1.default(this.context, {
                position: this.rover.interpolatedPosition,
                angle: this.rover.angle,
                width: ROVER_WIDTH,
                height: ROVER_HEIGHT
            }, this.trace, this.markers, this.renderingOptions);
        };
        const { loop, element, renderingOptions = {}, locationsOfInterest = [], origin } = simulationOptions;
        const { height = 500, width = 500 } = renderingOptions;
        this.loop = loop;
        const canvas = this.createCanvas(element, width, height);
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Cannot create 2D rendering context for canvas.');
        }
        this.initMarkers(locationsOfInterest, origin);
        const world = new p2_1.default.World({
            gravity: [0, 0]
        });
        const rover = new p2_1.default.Body({ mass: 1 });
        rover.addShape(new p2_1.default.Box({ width: ROVER_WIDTH, height: ROVER_HEIGHT }));
        world.addBody(rover);
        const vehicle = new p2_1.default.TopDownVehicle(rover);
        const wheelConstraints = INITIAL_WHEEL_CONSTRAINTS.map(({ sideFriction, brakeForce, localPosition }) => {
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
        this.renderingOptions = Object.assign(Object.assign({}, renderingOptions), { width,
            height });
        this.offset = new latlon_spherical_js_1.default(origin.latitude, origin.longitude);
    }
    createCanvas(parent, width, height) {
        const document = parent.ownerDocument;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        parent.appendChild(canvas);
        return canvas;
    }
    initMarkers(locationsOfInterest, origin) {
        console.log('lois', locationsOfInterest);
        if (origin) {
            this.markers = locationsOfInterest.map(({ label, latitude, longitude }) => {
                const markerLatLon = new latlon_spherical_js_1.default(latitude, longitude);
                const x = markerLatLon.distanceTo(new latlon_spherical_js_1.default(latitude, origin.longitude));
                const y = markerLatLon.distanceTo(new latlon_spherical_js_1.default(origin.latitude, longitude));
                return {
                    position: [x, y],
                    label
                };
            });
            console.log(this.markers);
        }
    }
    getRoverHeading() {
        let heading = this.rover.angle % (2 * Math.PI);
        if (heading < 0) {
            heading += 2 * Math.PI;
        }
        return (180 / Math.PI) * heading;
    }
    getRoverLocation() {
        const [x, y] = this.rover.interpolatedPosition;
        return {
            longitude: this.offset.destinationPoint(Math.abs(x), x <= 0 ? 270 : 90).longitude,
            latitude: this.offset.destinationPoint(Math.abs(y), y <= 0 ? 180 : 0).latitude
        };
    }
    start() {
        if (this.interval) {
            throw new Error('Simulation is already running.');
        }
        this.startTime = (new Date()).getTime();
        this.interval = window.setInterval(() => {
            const clock = (new Date()).getTime() - this.startTime;
            const actuatorValues = this.loop({
                heading: this.getRoverHeading(),
                location: this.getRoverLocation(),
                clock,
            }, {
                engines: this.engines
            });
            const { engines } = actuatorValues;
            if (engines.length === this.engines.length) {
                for (let i = 0; i < engines.length; i++) {
                    if (engines[i] <= 1.0 && engines[i] >= -1.0) {
                        this.engines[i] = engines[i];
                        this.wheelConstraints[i].engineForce = BASE_ENGINE_FORCE * engines[i];
                    }
                    else {
                        console.log('Wheel power out of range [-1.0 : 1.0]');
                    }
                }
            }
        }, CONTROL_INTERVAL);
        this.animationFrame = requestAnimationFrame(this.animate);
    }
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
    trackPosition() {
        const position = this.rover.interpolatedPosition;
        const [lastPosition] = this.trace;
        if (!lastPosition || tools_1.distance(lastPosition, position) > MIN_TRACKING_POINT_DISTANCE) {
            this.trace.unshift([...position]);
        }
    }
}
exports.Simulation = Simulation;
